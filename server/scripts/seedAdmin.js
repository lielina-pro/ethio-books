const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User } = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = 'admin@ethiobooks.com';

    let admin = await User.findOne({ role: 'admin', email });

    if (!admin) {
      const hashedPassword = await bcrypt.hash('Admin@12345', 10);

      admin = await User.create({
        fullName: 'Lielina Fekadu',
        email,
        phone: '0000000000',
        role: 'admin',
        password: hashedPassword,
        status: 'active'
      });
    }

    console.log('Admin Created Successfully');
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedAdmin();

