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
const { User } = require('./models/User');
const { Message } = require('./models/Message');
const { Transaction } = require('./models/Transaction');
const { Notification } = require('./models/Notification');
const cloudinary = require('cloudinary').v2;

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Ethio Books API is running' });
});

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

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
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

      // Gate student access: must be premium or have approved transaction with tutor
      if (user.role === 'student') {
        const receiverUser = await User.findById(receiverId);
        if (receiverUser && receiverUser.role === 'tutor') {
          const student = await User.findById(user.id);
          if (!student.isPremium) {
            const validTx = await Transaction.findOne({
              student: student._id,
              tutor: receiverUser._id,
              status: 'approved'
            });
            if (!validTx) {
              socket.emit(
                'messageError',
                'You must buy this tutor\'s content or be Premium to chat.'
              );
              return;
            }
          }
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
        }
      };

      io.to(roomId).emit('newMessage', messageData);
      io.to('admin-monitor').emit('newMessage', messageData);

      // Notification for receiver
      try {
        await Notification.create({
          user: receiverId,
          message: `New message from ${message.sender.fullName}`,
          type: 'message'
        });
        io.to(`user:${receiverId}`).emit('notification', {
          message: `New message from ${message.sender.fullName}`,
          type: 'message',
          createdAt: new Date().toISOString()
        });
      } catch (notifyErr) {
        console.error('Notification creation error:', notifyErr);
      }
    } catch (err) {
      console.error('sendMessage error:', err);
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

