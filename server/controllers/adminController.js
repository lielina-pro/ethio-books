const { User } = require('../models/User');
const { Transaction } = require('../models/Transaction');
const { Notification } = require('../models/Notification');
const { Content } = require('../models/Content');
const { ContentPurchase } = require('../models/ContentPurchase');

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

// @desc    Delete/disable a tutor (and all their uploaded content)
// @route   DELETE /api/admin/tutors/:id
const deleteTutor = async (req, res) => {
  try {
    const { id } = req.params;

    const tutor = await User.findOne({ _id: id, role: 'tutor' });
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    // 1) Delete all content uploaded by this tutor
    const contentDocs = await Content.find({ uploadedBy: tutor._id }).select('_id');
    const contentIds = contentDocs.map((c) => c._id);

    if (contentIds.length > 0) {
      // 2) Delete all purchase proofs tied to those content items
      await ContentPurchase.deleteMany({ content: { $in: contentIds } });
      // 3) Delete the content itself
      await Content.deleteMany({ uploadedBy: tutor._id });
    }

    // 4) Delete related notifications for this user (optional cleanup)
    await Notification.deleteMany({ user: tutor._id });

    // 5) Delete the tutor user
    await User.findByIdAndDelete(tutor._id);

    return res.json({ message: 'Tutor deleted' });
  } catch (error) {
    console.error('deleteTutor error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Content pending tutor moderation
// @route   GET /api/admin/pending-content
const getPendingContent = async (_req, res) => {
  try {
    const items = await Content.find({ moderationStatus: 'pending' })
      .populate('uploadedBy', 'fullName email role')
      .sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    console.error('getPendingContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route   PATCH /api/admin/approve-content/:id
const approveContent = async (req, res) => {
  try {
    const item = await Content.findByIdAndUpdate(
      req.params.id,
      { moderationStatus: 'approved', status: 'approved', moderationNote: '' },
      { new: true }
    ).populate('uploadedBy', 'fullName');

    if (!item) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const io = req.app.get('io');
    if (item.uploadedBy && item.uploadedBy._id) {
      await Notification.create({
        user: item.uploadedBy._id,
        message: `Your content "${item.title}" was approved and is now visible to students.`,
        type: 'content'
      });
      if (io) {
        io.to(`user:${item.uploadedBy._id.toString()}`).emit('notification', {
          message: `Your content "${item.title}" was approved.`,
          type: 'content',
          createdAt: new Date().toISOString()
        });
      }
    }

    return res.json(item);
  } catch (error) {
    console.error('approveContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route   PATCH /api/admin/reject-content/:id
const rejectContent = async (req, res) => {
  try {
    const { note } = req.body || {};
    const item = await Content.findByIdAndUpdate(
      req.params.id,
      {
        moderationStatus: 'rejected',
        moderationNote: note || 'Does not meet guidelines.'
      },
      { new: true }
    ).populate('uploadedBy', 'fullName');

    if (!item) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const io = req.app.get('io');
    if (item.uploadedBy && item.uploadedBy._id) {
      await Notification.create({
        user: item.uploadedBy._id,
        message: `Content rejected: "${item.title}". ${note || ''}`,
        type: 'content'
      });
      if (io) {
        io.to(`user:${item.uploadedBy._id.toString()}`).emit('notification', {
          message: `Content "${item.title}" was rejected.`,
          type: 'content',
          createdAt: new Date().toISOString()
        });
      }
    }

    return res.json(item);
  } catch (error) {
    console.error('rejectContent error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route   GET /api/admin/pending-content-purchases
const getPendingContentPurchases = async (_req, res) => {
  try {
    const rows = await ContentPurchase.find({ status: 'pending' })
      .populate('student', 'fullName phone grade')
      .populate({
        path: 'content',
        select: 'title accessType priceEtb contentType pdfUrl videoUrl grade subject uploadedBy',
        populate: { path: 'uploadedBy', select: 'fullName' }
      })
      .sort({ createdAt: -1 });
    return res.json(rows);
  } catch (error) {
    console.error('getPendingContentPurchases error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route   PATCH /api/admin/approve-content-purchase/:id
const approveContentPurchase = async (req, res) => {
  try {
    const purchase = await ContentPurchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    if (purchase.status !== 'pending') {
      return res.status(400).json({ message: 'Not pending' });
    }
    purchase.status = 'approved';
    await purchase.save();

    const content = await Content.findById(purchase.content);
    const io = req.app.get('io');
    await Notification.create({
      user: purchase.student,
      message: `Your payment for "${content?.title || 'content'}" was approved. You can open it now.`,
      type: 'content_access'
    });
    if (io) {
      io.to(`user:${purchase.student.toString()}`).emit('notification', {
        message: 'Payment approved — your content is unlocked.',
        type: 'content_access',
        createdAt: new Date().toISOString()
      });
    }

    const populated = await ContentPurchase.findById(purchase._id)
      .populate('student', 'fullName')
      .populate('content', 'title');
    return res.json(populated);
  } catch (error) {
    console.error('approveContentPurchase error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @route   PATCH /api/admin/reject-content-purchase/:id
const rejectContentPurchase = async (req, res) => {
  try {
    const { note } = req.body || {};
    const purchase = await ContentPurchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    purchase.status = 'rejected';
    purchase.adminNote = note || '';
    await purchase.save();

    const content = await Content.findById(purchase.content);
    const io = req.app.get('io');
    await Notification.create({
      user: purchase.student,
      message: `Your payment proof for "${content?.title || 'content'}" was rejected. ${note || ''}`,
      type: 'content_access'
    });
    if (io) {
      io.to(`user:${purchase.student.toString()}`).emit('notification', {
        message: 'Payment proof was rejected — check details and resubmit.',
        type: 'content_access',
        createdAt: new Date().toISOString()
      });
    }

    return res.json(purchase);
  } catch (error) {
    console.error('rejectContentPurchase error:', error);
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
  deleteUser,
  deleteTutor,
  getPendingContent,
  approveContent,
  rejectContent,
  getPendingContentPurchases,
  approveContentPurchase,
  rejectContentPurchase
};