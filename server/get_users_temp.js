require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find({}, { email: 1, role: 1, name: 1, _id: 0 });
    console.log("--- USER LIST ---");
    console.table(users.map(u => u.toObject()));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    process.exit();
  }
};

run();
