const mongoose = require('mongoose');

const USER_ROLES = ['student', 'tutor', 'admin'];

const userSchema = new mongoose.Schema(
  {
    // Core identity
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'student'
    },

    // Auth
    password: { type: String, required: true, minlength: 6 },
    status: {
      type: String,
      enum: ['pending', 'active', 'blocked', 'approved', 'rejected'], // Added approved/rejected to status enum
      default: 'pending'
    },

    // Contact / shared fields
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      required: function () {
        // Email is required for tutors and admins
        return this.role === 'tutor' || this.role === 'admin';
      }
    },
    phone: { type: String, required: true, trim: true },
    age: { type: Number, min: 0 },
    gender: { type: String, trim: true },

    // Tutor-specific fields
    telegramUsername: { type: String, trim: true }, // e.g. @username
    educationLevel: { type: String, trim: true }, // e.g. BSc, MSc, etc.
    achievements: { type: String, trim: true }, // free-text description
    
    // NEW FIELDS FOR ADMIN WORKFLOW
    rejectionNote: { type: String, default: "" }, // Stores the "Why rejected" message
    isVerified: { type: Boolean, default: false }, // Useful for badges/filtering
    
    docs: [
      {
        type: String,
        trim: true // Cloudinary URLs or similar
      }
    ],
    trialVideoUrl: {
      type: String,
      trim: true
    },
    tutorStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    ratingsCount: {
      type: Number,
      default: 0
    },

    // Student-specific fields
    grade: {
      type: Number,
      min: 7,
      max: 12
    },
    schoolName: { type: String, trim: true },
    isPremium: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = { User, USER_ROLES };