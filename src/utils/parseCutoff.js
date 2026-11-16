// Reads the "date" from the query string or JSON body and returns { through } or { error }.
// "through" is the last moment to delete, inclusive:
//  - "YYYY-MM-DD"                       -> the end of that day (UTC), so the whole day is included
//  - "YYYY-MM-DDTHH:mm[:ss[.sss]]"      -> exactly that moment; optional Z / +05:00 offset, UTC if omitted
function parseCutoff(req) {
  const raw = req.query.date || (req.body && req.body.date);
  const m =
    typeof raw === 'string' &&
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)(Z|[+-]\d{2}:\d{2})?)?$/i.exec(raw.trim());
  if (!m) return { error: 'date is required as YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss[Z|+hh:mm]' };

  const [, day, time = '00:00:00', offset = 'Z'] = m;
  const moment = new Date(`${day}T${time.length === 5 ? `${time}:00` : time}${offset.toUpperCase()}`);
  if (Number.isNaN(moment.getTime()) || (!m[2] && moment.toISOString().slice(0, 10) !== day)) {
    return { error: 'date is not a valid calendar date/time' };
  }

  return { through: m[2] ? moment : new Date(moment.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

module.exports = parseCutoff;
