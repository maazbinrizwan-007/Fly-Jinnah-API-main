// Accepts both plain JSON ("2026-09-29T00:00:00Z") and MongoDB Extended JSON
// ({ "$date": "..." }, { "$oid": "..." }) like the sample exports use.
function unwrap(value) {
  if (value && typeof value === 'object') {
    if ('$date' in value) return value.$date;
    if ('$oid' in value) return value.$oid;
  }
  return value;
}

function toDate(value) {
  const raw = unwrap(value);
  if (raw === undefined || raw === null || raw === '') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function str(value) {
  return value === undefined || value === null ? null : String(value).trim();
}

const PASSENGER_FIELDS = [
  'Title', 'PassengerName', 'CNIC_Passport', 'PassportIssueCountry',
  'PNR', 'TicketNo', 'Gender', 'Nationality', 'Status',
];

// Returns { flight } on success or { errors: [...] } if the record is unusable.
function normalizeFlight(input, index) {
  const errors = [];
  const at = `records[${index}]`;

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { errors: [`${at}: must be an object`] };
  }

  const flight = {
    AirlineName: str(input.AirlineName) || 'Fly Jinnah',
    FlightNo: str(input.FlightNo),
    BoardingCity: str(input.BoardingCity),
    DestinationCity: str(input.DestinationCity),
    FlightDate: toDate(input.FlightDate),
    FlightTime: str(input.FlightTime),
    ManifestID: str(input.ManifestID),
    Passengers: [],
  };

  for (const f of ['FlightNo', 'BoardingCity', 'DestinationCity', 'FlightTime']) {
    if (!flight[f]) errors.push(`${at}.${f} is required`);
  }
  if (!flight.FlightDate) errors.push(`${at}.FlightDate is required and must be a valid date`);

  if (input.Passengers !== undefined && !Array.isArray(input.Passengers)) {
    errors.push(`${at}.Passengers must be an array`);
  } else {
    (input.Passengers || []).forEach((p, i) => {
      if (!p || typeof p !== 'object') {
        errors.push(`${at}.Passengers[${i}] must be an object`);
        return;
      }
      const passenger = { ...p };
      for (const f of PASSENGER_FIELDS) passenger[f] = str(p[f]);
      if (!passenger.PassengerName) errors.push(`${at}.Passengers[${i}].PassengerName is required`);
      if (!passenger.CNIC_Passport) errors.push(`${at}.Passengers[${i}].CNIC_Passport is required`);
      flight.Passengers.push(passenger);
    });
  }

  return errors.length ? { errors } : { flight };
}

module.exports = normalizeFlight;
