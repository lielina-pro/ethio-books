const mongoose = require('mongoose');

const CONTENT_TYPES = ['textbook', 'quiz', 'video'];

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2,
        message: 'Quiz question must have at least 2 options'
      },
      required: true
    },
    correct: {
      type: Number,
      min: 0,
      required: true
    }
  },
  { _id: false }
);

const courseLessonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['video', 'pdf', 'quiz'], required: true },
    url: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const courseSectionSchema = new mongoose.Schema(
  {
    sectionTitle: { type: String, required: true, trim: true },
    lessons: {
      type: [courseLessonSchema],
      default: []
    }
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    grade: {
      type: Number,
      min: 7,
      max: 12,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    // Textbook (PDF) content
    pdfUrl: {
      type: String,
      trim: true
    },
    // Video (YouTube) content
    videoUrl: {
      type: String,
      trim: true
    },
    // Quiz content
    quizData: {
      questions: {
        type: [quizQuestionSchema],
        default: []
      }
    },
    contentType: {
      type: String,
      enum: CONTENT_TYPES,
      required: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    /** Tutor marketplace: free vs paid (per-item unlock via ContentPurchase) */
    accessType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free'
    },
    priceEtb: {
      type: Number,
      min: 10,
      max: 200
    },
    /** Admin moderation for tutor-submitted materials */
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    // Legacy + requested field name used in some parts of the app.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    },
    moderationNote: {
      type: String,
      trim: true,
      default: ''
    },
    courseData: {
      thumbnail: {
        type: String,
        trim: true,
        default: ''
      },
      sections: {
        type: [courseSectionSchema],
        default: []
      }
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Content = mongoose.model('Content', contentSchema);

module.exports = { Content, CONTENT_TYPES };

