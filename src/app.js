const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const jwtAuth = require('./middleware/apiKeyAuth');
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');

const app = express();

// Behind Vercel's proxy: needed so rate limiting sees the real client IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, slow down' },
  })
);

// Serverless-friendly: connect on first request and reuse the connection across warm invocations.
let connecting;
function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose.connect(process.env.MONGO_URI).catch((err) => {
      connecting = null;
      throw err;
    });
  }
  return connecting;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/flyjinnah', jwtAuth, flightRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Payload too large' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
