const express = require('express');
const parseCutoff = require('../utils/parseCutoff');
const FlyJinnahFlight = require('../models/FlyJinnahFlight');
const SouthAirlineFlight = require('../models/SouthAirlineFlight');

// Add a new airline's model here and both combined endpoints cover it.
const AIRLINES = [
  { key: 'flyjinnah', Flight: FlyJinnahFlight },
  { key: 'southairline', Flight: SouthAirlineFlight },
];

const router = express.Router();

// Reads the optional "airline" parameter (query or JSON body): "flyjinnah", "southairline",
// several separated by commas, or "all" / omitted for every airline. Returns { airlines } or { error }.
function selectAirlines(req) {
  const raw = req.query.airline || (req.body && req.body.airline);
  if (raw === undefined || raw === '') return { airlines: AIRLINES };
  const names = (Array.isArray(raw) ? raw : String(raw).split(',')).map((n) => String(n).trim().toLowerCase());
  if (names.includes('all')) return { airlines: AIRLINES };

  const unknown = names.filter((n) => !AIRLINES.some(({ key }) => key === n));
  if (unknown.length) {
    return { error: `Unknown airline: ${unknown.join(', ')}. Use ${AIRLINES.map(({ key }) => key).join(', ')} or all` };
  }
  return { airlines: AIRLINES.filter(({ key }) => names.includes(key)) };
}

// GET /api/v1/airlines/dump_airlines_data
// Optional ?airline=flyjinnah,southairline (default: all).
// Returns every flight of the selected airlines in one list (each tagged with Source), plus per-airline counts.
router.get('/dump_airlines_data', async (req, res, next) => {
  try {
    const selected = selectAirlines(req);
    if (selected.error) return res.status(400).json({ success: false, message: selected.error });
    const { airlines } = selected;

    const lists = await Promise.all(airlines.map(({ Flight }) => Flight.find().lean()));
    const counts = {};
    const data = [];
    airlines.forEach(({ key }, i) => {
      counts[key] = lists[i].length;
      lists[i].forEach((flight) => data.push({ Source: key, ...flight }));
    });
    data.sort((a, b) => a.FlightDate - b.FlightDate || String(a.FlightTime).localeCompare(String(b.FlightTime)));

    res.json({ success: true, count: data.length, counts, data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/airlines/delete_airlines_data?date=...   (or JSON body { "date": "..." })
// Optional ?airline=flyjinnah,southairline (default: all).
// Deletes records created on or before the given date-time from the selected airlines.
router.delete('/delete_airlines_data', async (req, res, next) => {
  try {
    const cutoff = parseCutoff(req);
    if (cutoff.error) return res.status(400).json({ success: false, message: cutoff.error });
    const selected = selectAirlines(req);
    if (selected.error) return res.status(400).json({ success: false, message: selected.error });
    const { airlines } = selected;

    const results = await Promise.all(
      airlines.map(({ Flight }) => Flight.deleteMany({ createdTime: { $lte: cutoff.through } }))
    );
    const deleted = {};
    airlines.forEach(({ key }, i) => {
      deleted[key] = results[i].deletedCount;
    });

    res.json({
      success: true,
      message: `Deleted records created up to ${cutoff.through.toISOString()}`,
      deleted: results.reduce((sum, r) => sum + r.deletedCount, 0),
      deletedByAirline: deleted,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
