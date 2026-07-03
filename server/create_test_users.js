require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = [
      { email: 'admin@test.com', role: 'admin', name: 'Test Admin' },
      { email: 'partner@test.com', role: 'delivery_partner', name: 'Test Partner' },
      { email: 'customer@test.com', role: 'customer', name: 'Test Customer' }
    ];

    for (const u of users) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = new User(u);
      }
      user.password = 'Password123!';
      await user.save();
      console.log('Created/Updated', u.email);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
};
run();
