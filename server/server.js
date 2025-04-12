const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('./config/database');
const Message = require('./models/Message');
const Admin = require('./models/Admin');
const User = require('./models/User');
const AuthorizedUser = require('./models/AuthorizedUser');
const { Op } = require('sequelize');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: "https://chat.webvana.in",
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://chat.webvana.in/"], 
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Set up associations
Message.associate({ User });

// Initialize database and sync models
sequelize.sync()
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Error syncing database:', err));

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.user = decoded;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Admin routes
app.post('/api/admin/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.create({ email, password });
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Authorized user management routes
app.post('/api/admin/authorized-users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { email, name } = req.body;
    const authorizedUser = await AuthorizedUser.create({ email, name });
    res.status(201).json(authorizedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/authorized-users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const authorizedUsers = await AuthorizedUser.findAll();
    res.json(authorizedUsers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User routes
app.post('/api/users/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if email is authorized
    const authorizedUser = await AuthorizedUser.findOne({ where: { email } });
    if (!authorizedUser) {
      return res.status(403).json({ error: 'Email not authorized' });
    }

    const user = await User.create({ email, password, name });
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'name', 'isOnline'],
      where: {
        id: {
          [Op.ne]: req.user.id // Exclude the current user
        }
      }
    });

    // Get current user's data
    const currentUser = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'name', 'isOnline']
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }

    // Return both current user and other users
    res.json([currentUser, ...users]);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Message routes
app.get('/api/messages', verifyToken, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: req.user.id },
          { recipient_id: req.user.id }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Mark messages as read if they are to the current user
    await Message.update(
      { read: true },
      {
        where: {
          recipient_id: req.user.id,
          read: false
        }
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', async (socket) => {
  console.log('User connected:', socket.user.id);
  
  try {
    // Store socket connection
    connectedUsers.set(socket.user.id, socket);

    // Update user's online status
    await User.update({ isOnline: true }, { 
      where: { id: socket.user.id }
    });
    
    // Notify other users
    socket.broadcast.emit('userStatus', {
      userId: socket.user.id,
      isOnline: true
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log('User disconnected:', socket.user.id);
        // Remove from connected users
        connectedUsers.delete(socket.user.id);
        
        await User.update({ isOnline: false }, { 
          where: { id: socket.user.id }
        });
        
        socket.broadcast.emit('userStatus', {
          userId: socket.user.id,
          isOnline: false
        });
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

  } catch (error) {
    console.error('Socket connection error:', error);
    socket.disconnect(true);
  }
});

// Update the message sending route to use direct socket connections
app.post('/api/messages', verifyToken, async (req, res) => {
  try {
    const { content, recipientId } = req.body;
    const sender_id = req.user.id;

    // Validate recipient exists
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = await Message.create({
      content,
      sender_id,
      recipient_id: recipientId,
      type: 'direct',
      read: false
    });

    // Get the message with sender and recipient information
    const messageWithDetails = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Send to specific sockets instead of broadcasting to all
    const recipientSocket = connectedUsers.get(recipientId);
    const senderSocket = connectedUsers.get(sender_id);

    if (recipientSocket) {
      recipientSocket.emit('newMessage', messageWithDetails);
    }
    if (senderSocket) {
      senderSocket.emit('newMessage', messageWithDetails);
    }

    res.status(201).json(messageWithDetails);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
