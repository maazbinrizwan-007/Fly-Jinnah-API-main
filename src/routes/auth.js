const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Compared against when the username doesn't exist, so response time doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// Exchanges username + password (checked against the users collection) for a JWT valid for 7 days.
router.post('/token', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required' });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() }).select('+passwordHash');
    const passOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user || !user.isActive || !passOk) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
    res.json({ success: true, token, tokenType: 'Bearer', expiresIn: '7d' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
