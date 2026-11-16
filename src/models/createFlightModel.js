const mongoose = require('mongoose');

// Superset of the passenger fields seen in the Airblue and PIA tables.
const passengerSchema = new mongoose.Schema(
  {
    Title: { type: String, default: null },
    PassengerName: { type: String, required: true, trim: true },
    CNIC_Passport: { type: String, required: true, trim: true },
    PassportIssueCountry: { type: String, default: null },
    PNR: { type: String, default: null, trim: true },
    TicketNo: { type: String, default: null, trim: true },
    Gender: { type: String, default: null },
    Nationality: { type: String, default: null },
    Status: { type: String, default: null },
  },
  { _id: false, strict: false } // keep any extra passenger fields Fly Jinnah sends
);

// One model per airline; all share the same schema, each with its own collection.
function createFlightModel(modelName, collection, airlineName) {
  const flightSchema = new mongoose.Schema(
    {
      AirlineName: { type: String, default: airlineName, trim: true },
      FlightNo: { type: String, required: true, trim: true },
      BoardingCity: { type: String, required: true, trim: true },
      DestinationCity: { type: String, required: true, trim: true },
      FlightDate: { type: Date, required: true },
      FlightTime: { type: String, required: true, trim: true },
      ManifestID: { type: String, default: null },
      Passengers: { type: [passengerSchema], default: [] },
      createdTime: { type: Date, default: Date.now },
      updatedTime: { type: Date, default: Date.now },
    },
    { collection }
  );

  // One document per flight leg; a re-post of the same flight updates it instead of duplicating.
  flightSchema.index(
    { FlightNo: 1, FlightDate: 1, FlightTime: 1, BoardingCity: 1, DestinationCity: 1 },
    { unique: true }
  );

  return mongoose.model(modelName, flightSchema);
}

module.exports = createFlightModel;
