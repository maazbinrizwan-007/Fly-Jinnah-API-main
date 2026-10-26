require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const jwtAuth = require('./middleware/apiKeyAuth');
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');

const { PORT = 5000, MONGO_URI, JWT_SECRET } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set in .env');
  process.exit(1);
}

const app = express();

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
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

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Fly Jinnah API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

