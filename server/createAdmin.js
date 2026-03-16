require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is installed, or change to 'bcrypt'
const { User } = require('./models/User');

async function createAdmin() {
  try {
    // Connect to MongoDB using the URI from .env
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Delete existing admin if any (optional, just to avoid duplicate email errors)
    await User.deleteOne({ email: 'admin@ethiobooks.com' });

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create the admin user
    // Note: phone and fullName are required by your User schema
    const adminUser = new User({
      fullName: 'System Administrator',
      email: 'admin@ethiobooks.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+1234567890', // Required by schema
      status: 'active'
    });

    // Save to database
    await adminUser.save();
    console.log('Admin user successfully created!');
    console.log('Email: admin@ethiobooks.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Disconnect and exit
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
