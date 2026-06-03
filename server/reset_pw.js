require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'rajesh@gmail.com' });
    if (user) {
      user.password = 'Password123!';
      await user.save();
      console.log('Successfully reset password for rajesh@gmail.com to: Password123!');
    } else {
      console.log('User rajesh@gmail.com not found in the database.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
};

run();
