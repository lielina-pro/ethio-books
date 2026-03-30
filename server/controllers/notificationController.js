const { Notification } = require('../models/Notification');

const getMyNotifications = async (req, res) => {
  try {
    const rows = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(rows);
  } catch (error) {
    console.error('getMyNotifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    return res.json({ count });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    const rows = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    return res.json({ notifications: rows });
  } catch (error) {
    console.error('markAllRead error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.json(updated);
  } catch (error) {
    console.error('markRead error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAllRead,
  markRead
};

