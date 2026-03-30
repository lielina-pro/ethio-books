const { Message } = require('../models/Message');
const { User } = require('../models/User');
const { Notification } = require('../models/Notification');

const buildRoomId = (a, b) => [a.toString(), b.toString()].sort().join('_');

// GET /api/messages/recent?limit=5
// Recent messages received by current user (tutor dashboard uses this)
const getRecentMessages = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 5));
    const me = req.user;

    // For tutors, show student -> tutor messages (inbox-like).
    // For admins/students, this still returns "received" messages.
    const rows = await Message.find({ receiver: me._id })
      .populate('sender', 'fullName isPremium role')
      .sort({ createdAt: -1 })
      .limit(limit);

    const formatted = rows.map((m) => ({
      _id: m._id,
      senderId: m.sender?._id,
      senderName: m.sender?.fullName || 'User',
      senderIsPremium: !!m.sender?.isPremium,
      content: m.text,
      createdAt: m.createdAt,
      read: !!m.read
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('getRecentMessages error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/:otherUserId
// Returns conversation between current user and other user, marks received messages as read.
const getConversation = async (req, res) => {
  try {
    const meId = req.user._id.toString();
    const otherId = req.params.otherUserId;

    const other = await User.findById(otherId).select('fullName role isPremium');
    if (!other) return res.status(404).json({ message: 'User not found' });

    const roomId = buildRoomId(meId, otherId);

    const rows = await Message.find({ roomId })
      .populate('sender receiver', 'fullName role')
      .sort({ createdAt: 1 });

    // Mark as read: messages sent by other to me
    await Message.updateMany(
      { roomId, receiver: req.user._id, sender: other._id, read: { $ne: true } },
      { $set: { read: true } }
    );

    // Best-effort: also mark message notifications as read
    try {
      await Notification.updateMany(
        { user: req.user._id, type: 'message', read: false },
        { $set: { read: true } }
      );
    } catch (e) {
      // ignore
    }

    const formatted = rows.map((m) => ({
      _id: m._id,
      senderId: m.sender?._id?.toString(),
      receiverId: m.receiver?._id?.toString(),
      content: m.text,
      createdAt: m.createdAt
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('getConversation error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages
// Sends a DM using same role rules as sockets, and emits socket events.
const sendMessage = async (req, res) => {
  try {
    const me = req.user;
    const { receiverId, content } = req.body || {};

    if (!receiverId || !content || !String(content).trim()) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }

    const receiverUser = await User.findById(receiverId).select('role fullName');
    if (!receiverUser) return res.status(404).json({ message: 'Recipient not found' });

    // Permission rules aligned with server.js socket rules
    if (me.role === 'student') {
      const student = await User.findById(me._id).select('isPremium');
      if (receiverUser.role === 'tutor' && !student.isPremium) {
        return res.status(403).json({
          message: 'Premium students can message tutors. Free students can use Help Center (Admin) only.'
        });
      }
      if (receiverUser.role === 'student') {
        return res.status(403).json({ message: 'You can only message tutors (Premium) or Help Center.' });
      }
    }
    if (me.role === 'tutor') {
      if (receiverUser.role !== 'admin' && receiverUser.role !== 'student') {
        return res.status(403).json({ message: 'You can message students or Help Center only.' });
      }
    }

    const roomId = buildRoomId(me._id, receiverId);
    const message = await Message.create({
      sender: me._id,
      receiver: receiverId,
      text: String(content).trim(),
      roomId,
      read: false
    });

    await message.populate('sender receiver', 'fullName role');

    const io = req.app.get('io');
    const messageData = {
      id: message._id.toString(),
      roomId,
      text: message.text,
      timestamp: message.timestamp,
      sender: {
        id: message.sender._id.toString(),
        fullName: message.sender.fullName,
        role: message.sender.role
      },
      receiver: {
        id: message.receiver._id.toString(),
        fullName: message.receiver.fullName,
        role: message.receiver.role
      }
    };

    if (io) {
      io.to(roomId).emit('newMessage', messageData);
      io.to('admin-monitor').emit('newMessage', messageData);
    }

    // Create notification for receiver
    const preview = message.text.length > 50 ? `${message.text.substring(0, 50)}...` : message.text;
    await Notification.create({
      user: receiverId,
      type: receiverUser.role === 'admin' ? 'help_center' : 'message',
      title: 'New Message',
      message: `${message.sender.fullName} sent you a message: "${preview}"`,
      link: receiverUser.role === 'admin' ? '/admin' : '/tutor'
    });
    if (io) {
      io.to(`user:${receiverId}`).emit('notification', {
        message: `New message from ${message.sender.fullName}`,
        type: receiverUser.role === 'admin' ? 'help_center' : 'message',
        createdAt: new Date().toISOString()
      });
    }

    return res.status(201).json({ message: 'Sent', roomId, id: message._id });
  } catch (error) {
    console.error('sendMessage (REST) error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getRecentMessages,
  getConversation,
  sendMessage
};

