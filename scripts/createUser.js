// Usage: node scripts/createUser.js <username> <password>
// Creates the user, or resets the password if the username already exists.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node scripts/createUser.js <username> <password>');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI must be set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { username: username.trim().toLowerCase() },
    { passwordHash, isActive: true },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  console.log(`User "${user.username}" saved`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
