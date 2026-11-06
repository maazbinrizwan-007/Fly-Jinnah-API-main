const FlyJinnahFlight = require('../models/FlyJinnahFlight');
const normalizeFlight = require('../utils/normalizeFlight');

// Saves all flights in one database command (upsert):
//  - flight already exists (same number + date + time + route) -> update it
//  - flight does not exist                                      -> insert it
async function insertOrUpdateFlights(flights) {
  const now = new Date();
  const result = await FlyJinnahFlight.bulkWrite(
    flights.map((flight) => ({
      updateOne: {
        filter: {
          FlightNo: flight.FlightNo,
          FlightDate: flight.FlightDate,
          FlightTime: flight.FlightTime,
          BoardingCity: flight.BoardingCity,
          DestinationCity: flight.DestinationCity,
        },
        update: {
          $set: { ...flight, updatedTime: now },
          $setOnInsert: { createdTime: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return { inserted: result.upsertedCount, updated: result.matchedCount };
}

// POST /api/v1/flyjinnah/flights
// Body: a single flight object, or an array of flight objects.
async function receiveFlights(req, res, next) {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'Request body is empty' });
    }

    const flights = [];
    const errors = [];
    records.forEach((record, i) => {
      const result = normalizeFlight(record, i);
      if (result.errors) errors.push(...result.errors);
      else flights.push(result.flight);
    });

    // Reject the whole batch if anything is invalid, so the sender can fix and resend it.
    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    const { inserted, updated } = await insertOrUpdateFlights(flights);

    res.status(201).json({
      success: true,
      message: 'Data received',
      received: flights.length,
      inserted,
      updated,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/flyjinnah/dump_flyjinnah_data
// Returns every stored flight, oldest flight date first.
async function dumpFlights(req, res, next) {
  try {
    const flights = await FlyJinnahFlight.find().sort({ FlightDate: 1, FlightTime: 1 }).lean();
    res.json({ success: true, count: flights.length, data: flights });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/flyjinnah/delete_flyjinnah_data?date=2026-11-06T12:15:00Z   (or JSON body { "date": "..." })
// Deletes every record whose createdTime (when it was first received) is on or before the given date-time.
// A date-only value ("YYYY-MM-DD") covers that whole day (UTC), so records created on that day are deleted too.
// Accepts "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss[.sss]]" with an optional Z / +05:00 offset; without an offset it is UTC.
async function deleteFlights(req, res, next) {
  try {
    const raw = req.query.date || (req.body && req.body.date);
    const m =
      typeof raw === 'string' &&
      /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)(Z|[+-]\d{2}:\d{2})?)?$/i.exec(raw.trim());
    if (!m) {
      return res
        .status(400)
        .json({ success: false, message: 'date is required as YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss[Z|+hh:mm]' });
    }
    const [, day, time = '00:00:00', offset = 'Z'] = m;
    const before = new Date(`${day}T${time.length === 5 ? `${time}:00` : time}${offset.toUpperCase()}`);
    if (Number.isNaN(before.getTime()) || (!m[2] && before.toISOString().slice(0, 10) !== day)) {
      return res.status(400).json({ success: false, message: 'date is not a valid calendar date/time' });
    }

    // Date only -> up to the end of that day; with a time -> up to and including that exact moment.
    const through = m[2] ? before : new Date(before.getTime() + 24 * 60 * 60 * 1000 - 1);

    const { deletedCount } = await FlyJinnahFlight.deleteMany({ createdTime: { $lte: through } });
    res.json({
      success: true,
      message: `Deleted records created up to ${through.toISOString()}`,
      deleted: deletedCount,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { receiveFlights, dumpFlights, deleteFlights };
