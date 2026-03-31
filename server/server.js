const dotenv = require('dotenv');
// Load environment variables BEFORE any other imports that rely on them
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const contentRoutes = require('./routes/contentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const premiumRoutes = require('./routes/premiumRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { User } = require('./models/User');
const { Message } = require('./models/Message');
const { Notification } = require('./models/Notification');
const cloudinary = require('cloudinary').v2;

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://ethio-books-qztb.vercel.app',
  'https://ethio-books.vercel.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('CORS not allowed'));
      }
    },
    credentials: true
  })
);
// Cloudinary health check route
app.get('/api/health/cloudinary', async (req, res) => {
  try {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    console.log('Cloudinary env snapshot:', {
      cloudName: CLOUDINARY_CLOUD_NAME || 'undefined',
      apiKeyPrefix: CLOUDINARY_API_KEY ? CLOUDINARY_API_KEY.slice(0, 4) + '***' : 'undefined',
      hasSecret: !!CLOUDINARY_API_SECRET
    });

    const result = await cloudinary.api.ping();

    return res.json({
      ok: true,
      cloud_name: result?.cloud_name || CLOUDINARY_CLOUD_NAME || null
    });
  } catch (err) {
    console.error('Cloudinary ping failed:', err.message);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/messages', messageRoutes);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const adminSockets = new Set();
app.set('io', io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('JWT_SECRET is not configured'));
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = {
      id: user._id.toString(),
      role: user.role,
      fullName: user.fullName
    };

    next();
  } catch (err) {
    next(err);
  }
});

io.on('connection', (socket) => {
  const { user } = socket;

  if (user.role === 'admin') {
    adminSockets.add(socket);
    socket.join('admin-monitor');
  }

  socket.join(`user:${user.id}`);

  socket.on('joinRoom', (roomId) => {
    if (!roomId) return;

    socket.join(roomId);

    if (user.role !== 'admin') {
      adminSockets.forEach((adminSocket) => {
        adminSocket.join(roomId);
      });
    }
  });

  socket.on('sendMessage', async (payload) => {
    try {
      const { roomId, receiverId, text } = payload || {};
      if (!roomId || !receiverId || !text) return;

      const receiverUser = await User.findById(receiverId);
      if (!receiverUser) {
        socket.emit('messageError', 'Recipient not found.');
        return;
      }

      if (user.role === 'student') {
        const student = await User.findById(user.id);
        if (receiverUser.role === 'tutor' && !student.isPremium) {
          socket.emit(
            'messageError',
            'Premium students can message tutors. Free students can use Help Center (Admin) only.'
          );
          return;
        }
        if (receiverUser.role === 'student') {
          socket.emit('messageError', 'You can only message tutors (Premium) or Help Center.');
          return;
        }
      }

      if (user.role === 'tutor') {
        if (receiverUser.role !== 'admin' && receiverUser.role !== 'student') {
          socket.emit('messageError', 'You can message students or Help Center only.');
          return;
        }
      }

      const message = await Message.create({
        sender: user.id,
        receiver: receiverId,
        text,
        roomId
      });

      await message.populate('sender receiver', 'fullName role');

      const messageData = {
        id: message._id.toString(),
        roomId: message.roomId,
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
        },
        isHelpCenter: receiverUser.role === 'admin'
      };

      io.to(roomId).emit('newMessage', messageData);
      io.to('admin-monitor').emit('newMessage', messageData);
      if (receiverUser.role === 'admin') {
        io.to('admin-monitor').emit('helpCenterMessage', messageData);
      }

      try {
        const notifType = receiverUser.role === 'admin' ? 'help_center' : 'message';
        const preview =
          text && typeof text === 'string'
            ? text.trim().length > 50
              ? `${text.trim().slice(0, 50)}...`
              : text.trim()
            : '';
        await Notification.create({
          user: receiverId,
          type: notifType,
          title: 'New Message',
          message: `${message.sender.fullName} sent you a message${preview ? `: "${preview}"` : ''}`,
          link: receiverUser.role === 'admin' ? '/admin' : '/dashboard'
        });
        io.to(`user:${receiverId}`).emit('notification', {
          message: `New message from ${message.sender.fullName}`,
          type: notifType,
          createdAt: new Date().toISOString()
        });
      } catch (notifyErr) {
        console.error('Notification creation error:', notifyErr);
      }
    } catch (err) {
      console.error('sendMessage error:', err);
    }
  });

  socket.on('adminSendMessage', async (payload) => {
    try {
      if (user.role !== 'admin') return;
      const { receiverId, text } = payload || {};
      if (!receiverId || !text || !text.trim()) return;

      const receiverUser = await User.findById(receiverId);
      if (!receiverUser) {
        socket.emit('messageError', 'User not found.');
        return;
      }

      const roomId = [user.id, receiverId].sort().join('_');

      const message = await Message.create({
        sender: user.id,
        receiver: receiverId,
        text: text.trim(),
        roomId
      });

      await message.populate('sender receiver', 'fullName role');

      const messageData = {
        id: message._id.toString(),
        roomId: message.roomId,
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

      io.to(roomId).emit('newMessage', messageData);
      io.to('admin-monitor').emit('newMessage', messageData);

      try {
        await Notification.create({
          user: receiverId,
          message: `Message from Ethio Books: ${message.sender.fullName}`,
          type: 'message'
        });
        io.to(`user:${receiverId}`).emit('notification', {
          message: 'You have a message from support.',
          type: 'message',
          createdAt: new Date().toISOString()
        });
      } catch (notifyErr) {
        console.error('admin notify error:', notifyErr);
      }
    } catch (err) {
      console.error('adminSendMessage error:', err);
    }
  });

  socket.on('disconnect', () => {
    if (user.role === 'admin') {
      adminSockets.delete(socket);
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

