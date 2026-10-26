const crypto = require('crypto');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

// Requires the shared secret in the "x-api-key" header. Hashing both sides gives
// equal-length buffers so timingSafeEqual can compare without leaking length/timing.
module.exports = function apiKeyAuth(req, res, next) {
  const expected = process.env.FLYJINNAH_API_KEY;
  const provided = req.get('x-api-key');

  if (!provided || !crypto.timingSafeEqual(sha256(provided), sha256(expected))) {
    return res.status(401).json({ success: false, message: 'Invalid or missing API key' });
  }
  next();
};
