const PremiumRequest = require('../models/PremiumRequest');
const { User } = require('../models/User');
const { Notification } = require('../models/Notification');

// Student submits payment proof
const submitPremiumRequest = async (req, res) => {
  try {
    const { paymentMethod, accountNumber } = req.body || {};
    const studentId = req.user._id;

    if (!paymentMethod || !accountNumber) {
      return res.status(400).json({ message: 'paymentMethod and accountNumber are required' });
    }

    // With your existing Cloudinary multer storage, req.file.path is already a hosted URL.
    const screenshotUrl = req.file?.path;
    if (!screenshotUrl) {
      return res.status(400).json({ message: 'Screenshot is required' });
    }

    const request = await PremiumRequest.create({
      studentId,
      paymentMethod,
      accountNumber,
      screenshotUrl,
      status: 'pending'
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    const io = req.app.get('io');
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        type: 'premium_request',
        title: 'New Premium Request',
        message: `Student ${req.user.fullName} submitted a premium upgrade request.`,
        link: '/admin'
      });
      if (io) {
        io.to(`user:${admin._id.toString()}`).emit('notification', {
          message: 'New premium upgrade request submitted.',
          type: 'premium_request',
          createdAt: new Date().toISOString()
        });
      }
    }

    return res.status(201).json({ message: 'Payment proof submitted', requestId: request._id });
  } catch (error) {
    console.error('submitPremiumRequest error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin gets all pending premium requests
const getPendingPremiumRequests = async (_req, res) => {
  try {
    const requests = await PremiumRequest.find({ status: 'pending' })
      .populate('studentId', 'fullName email phone grade schoolName')
      .sort({ createdAt: -1 });
    return res.json(requests);
  } catch (error) {
    console.error('getPendingPremiumRequests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin approves premium request
const approvePremiumRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await PremiumRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'approved';
    request.approvedAt = new Date();
    request.rejectedReason = '';
    await request.save();

    const student = await User.findByIdAndUpdate(
      request.studentId,
      { isPremium: true, status: 'active' },
      { new: true }
    ).select('-password');

    const io = req.app.get('io');
    await Notification.create({
      user: request.studentId,
      type: 'premium_approved',
      title: 'Premium Account Activated!',
      message: 'Your premium request was approved. Enjoy premium features!',
      link: '/dashboard'
    });
    if (io) {
      io.to(`user:${request.studentId.toString()}`).emit('notification', {
        message: 'Premium activated! Your request was approved.',
        type: 'premium_approved',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ message: 'Premium request approved', student });
  } catch (error) {
    console.error('approvePremiumRequest error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin rejects premium request
const rejectPremiumRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body || {};

    const request = await PremiumRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'rejected';
    request.rejectedReason = reason || 'Payment proof could not be verified';
    await request.save();

    const io = req.app.get('io');
    await Notification.create({
      user: request.studentId,
      type: 'premium_rejected',
      title: 'Premium Request Update',
      message: `Your premium request was rejected. Reason: ${request.rejectedReason}`,
      link: '/dashboard'
    });
    if (io) {
      io.to(`user:${request.studentId.toString()}`).emit('notification', {
        message: 'Premium request rejected. Please resubmit.',
        type: 'premium_rejected',
        createdAt: new Date().toISOString()
      });
    }

    return res.json({ message: 'Premium request rejected' });
  } catch (error) {
    console.error('rejectPremiumRequest error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  submitPremiumRequest,
  getPendingPremiumRequests,
  approvePremiumRequest,
  rejectPremiumRequest
};

