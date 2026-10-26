const jwt = require('jsonwebtoken');

// Requires "Authorization: Bearer <jwt>", signed with JWT_SECRET and not expired.
module.exports = function jwtAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Missing bearer token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ success: false, message });
  }
};
