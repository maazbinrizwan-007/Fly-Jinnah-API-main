const normalizeFlight = require('../utils/normalizeFlight');

// Builds the submit-flights handler for one airline's flight model.
// Every airline shares the same logic; only the model (collection) and default AirlineName differ.
// Dump and delete live in routes/allAirlines.js and cover every airline with one route.
function createFlightController(Flight, defaultAirline) {
  // Saves all flights in one database command (upsert):
  //  - flight already exists (same number + date + time + route) -> update it
  //  - flight does not exist                                      -> insert it
  async function insertOrUpdateFlights(flights) {
    const now = new Date();
    const result = await Flight.bulkWrite(
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
        const result = normalizeFlight(record, i, defaultAirline);
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

  return { receiveFlights };
}

module.exports = createFlightController;
