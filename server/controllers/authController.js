const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

/**
 * Helper to generate JWT Token
 */
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: '7d'
  });
};

/**
 * @desc    Register General User (Standard Student)
 * @route   POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const {
      fullName, email, phone, age, gender,
      role = 'student', password, grade, schoolName
    } = req.body;

    // eslint-disable-next-line no-console
    console.log('[register] received:', {
      fullName: typeof fullName === 'string' ? fullName.slice(0, 40) : fullName,
      phone,
      role,
      gender,
      grade,
      schoolName: typeof schoolName === 'string' ? schoolName.slice(0, 40) : schoolName
    });

    // 1. Validation
    if (!fullName || !phone || !password) {
      return res.status(400).json({ message: 'Full name, phone and password are required' });
    }

    const normalizedGender =
      gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : gender;

    if (normalizedGender && !['Male', 'Female'].includes(normalizedGender)) {
      return res.status(400).json({ message: 'Gender must be Male or Female' });
    }

    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be created publicly' });
    }

    // 2. Check Existence (avoid querying { email: undefined })
    const or = [{ phone }];
    if (email) or.push({ email });
    const existingUser = await User.findOne({ $or: or });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create Student
    const user = await User.create({
      fullName,
      email,
      phone,
      age: age ? Number(age) : undefined,
      gender: normalizedGender || undefined,
      role,
      password: hashedPassword,
      status: 'active', // Students are active by default
      grade: grade ? Number(grade) : undefined,
      schoolName
    });

    const token = generateToken(user._id, user.role);
    return res.status(201).json({ message: 'Registered successfully', token, user });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const toSafeUser = (userDoc) => {
  if (!userDoc) return null;
  const obj = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete obj.password;
  return obj;
};

/**
 * @desc    Login User (Admin, Student, or Tutor)
 * @route   POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ message: 'Credentials and password are required' });
    }

    // Find user by email OR phone
    const user = await User.findOne(email ? { email } : { phone });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      message: 'Logged in successfully',
      token,
      user: toSafeUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Specific Register for Tutors with File Upload
 * @route   POST /api/auth/register-tutor
 */
const registerTutor = async (req, res) => {
  // Wrap in Try/Catch to prevent server crashes
  try {
    const {
      fullName,
      email,
      password,
      phone,
      educationLevel,
      achievements,
      telegramUsername,
      trialVideoUrl
    } = req.body;

    // 1. Validation
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    // 2. Handle uploaded documents (multi-file)
    // With multer-storage-cloudinary, each file's `path` is the hosted URL.
    // Prefer `req.docsUrls` if the middleware populated it.
    const docsUrls =
      Array.isArray(req.docsUrls) ? req.docsUrls : (req.files || []).map((f) => f.path);

    // 3. Check Existence
    const existingTutor = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingTutor) {
      return res.status(400).json({ message: 'Tutor with this email/phone already exists' });
    }

    // 4. Hash the Password (Crucial for login to work later)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Create Tutor Record
    const tutor = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'tutor',
      // Manual Status Setup for Admin Approval Workflow
      status: 'pending',
      isVerified: false,
      educationLevel,
      achievements,
      telegramUsername,
      trialVideoUrl,
      docs: docsUrls
    });

    const token = generateToken(tutor._id, tutor.role);

    return res.status(201).json({
      message: 'Tutor registered successfully. Waiting for admin approval.',
      token,
      user: toSafeUser(tutor)
    });

  } catch (error) {
    // Logging the error allows you to see the exact issue in the terminal
    console.error('Tutor Registration Error:', error);
    return res.status(500).json({
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 */
const getMe = async (req, res) => {
  return res.json(req.user);
};

/**
 * @desc    First admin user id for Help Center / DMs (any authenticated user)
 * @route   GET /api/auth/help-admin
 */
const getHelpAdmin = async (_req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' }).select('fullName');
    if (!admin) {
      return res.status(404).json({ message: 'No help center admin configured' });
    }
    return res.json({ _id: admin._id, fullName: admin.fullName });
  } catch (error) {
    console.error('getHelpAdmin error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  registerTutor,
  getMe,
  getHelpAdmin
};