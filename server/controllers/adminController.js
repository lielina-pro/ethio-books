const { User } = require('../models/User');
const { Transaction } = require('../models/Transaction');
const { Notification } = require('../models/Notification');

// @desc    Get all tutors with pending status
// @route   GET /api/admin/pending-tutors
const getPendingTutors = async (_req, res) => {
  try {
    const tutors = await User.find({
      role: 'tutor',
      tutorStatus: 'pending'
    }).select('-password');

    return res.json(tutors);
  } catch (error) {
    console.error('getPendingTutors error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve a tutor and make them active/verified
// @route   PATCH /api/admin/approve-tutor/:id
const approveTutor = async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await User.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        tutorStatus: 'approved',
        isVerified: true
      },
      { new: true }
    ).select('-password');

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // Notification Logic
    const io = req.app.get('io');
    if (io) {
      await Notification.create({
        user: tutor._id,
        message: 'Your tutor profile has been approved! You are now visible to students.',
        type: 'profile'
      });
      io.to(`user:${tutor._id.toString()}`).emit('notification', {
        message: 'Your tutor profile has been approved!',
        type: 'profile',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ message: 'Tutor approved successfully', tutor });
  } catch (error) {
    console.error('approveTutor error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject a tutor with a reason
// @route   PATCH /api/admin/reject-tutor/:id
const rejectTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const tutor = await User.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        tutorStatus: 'rejected',
        isVerified: false,
        rejectionNote: reason || 'Documents were insufficient or unclear.'
      },
      { new: true }
    ).select('-password');

    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const io = req.app.get('io');
    if (io) {
      await Notification.create({
        user: tutor._id,
        message: `Profile Rejected: ${reason}`,
        type: 'profile'
      });
      io.to(`user:${tutor._id.toString()}`).emit('notification', {
        message: `Your profile needs changes: ${reason}`,
        type: 'profile',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ message: 'Tutor rejected with feedback', tutor });
  } catch (error) {
    console.error('rejectTutor error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all pending premium transactions
// @route   GET /api/admin/pending-transactions
const getPendingTransactions = async (_req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'pending' })
      .populate('student', 'fullName phone grade schoolName isPremium status')
      .sort({ createdAt: -1 });

    return res.json(transactions);
  } catch (error) {
    console.error('getPendingTransactions error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve premium payment
// @route   PATCH /api/admin/approve-premium/:id
const approvePremium = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending transactions can be approved' });
    }

    transaction.status = 'approved';
    await transaction.save();

    const student = await User.findByIdAndUpdate(
      transaction.student,
      { isPremium: true, status: 'active' },
      { new: true }
    ).select('-password');

    const io = req.app.get('io');
    if (io && student) {
      await Notification.create({
        user: student._id,
        message: 'Your payment was approved! Premium is now active.',
        type: 'payment'
      });
      io.to(`user:${student._id.toString()}`).emit('notification', {
        message: 'Your payment was approved! Premium is now active.',
        type: 'payment',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ message: 'Premium approved', transaction, student });
  } catch (error) {
    console.error('approvePremium error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users (students and tutors)
// @route   GET /api/admin/users
const getUsers = async (_req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['student', 'tutor'] }
    }).select('-password');

    return res.json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Block a user
// @route   PATCH /api/admin/block-user/:id
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { status: 'blocked' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'User blocked', user });
  } catch (error) {
    console.error('blockUser error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getPendingTransactions,
  approvePremium,
  getUsers,
  blockUser,
  deleteUser
};