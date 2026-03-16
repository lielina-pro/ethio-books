const mongoose = require('mongoose');

const TRANSACTION_STATUSES = ['pending', 'approved', 'rejected'];

const transactionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    screenshotUrl: {
      type: String,
      required: true,
      trim: true // Cloudinary URL
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Transaction, TRANSACTION_STATUSES };

