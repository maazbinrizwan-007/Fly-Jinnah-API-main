require('dotenv').config();

const { PORT = 5000, MONGO_URI, JWT_SECRET } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error('MONGO_URI and JWT_SECRET must be set in .env');
  process.exit(1);
}

// Local entry point. On Vercel, api/index.js exports the app instead.
require('./app').listen(PORT, () => console.log(`Fly Jinnah API listening on http://localhost:${PORT}`));
