const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ===== IMPORT ROUTES =====
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const readingRoutes = require('./routes/readings');
const alertRoutes = require('./routes/alerts');
const environmentalRoutes = require('./routes/environmental');
const emergencyContactsRoutes = require('./routes/emergencyContacts');
const medicationRoutes = require('./routes/medications');
const messageRoutes = require('./routes/messages');

// ===== SOCKET.IO SETUP =====
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ===== MIDDLEWARE (ORDER MATTERS!) =====
// 1. CORS first
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
  credentials: true,
}));

// 2. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== ROUTES =====
// Public routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes (order doesn't matter much, but keep them together)
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api', emergencyContactsRoutes);  // ← This handles /api/emergency-contacts
app.use('/api/medications', medicationRoutes);
app.use('/api/messages', messageRoutes);

// Test DB endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const status = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const collections = await mongoose.connection.db.listCollections().toArray();
    res.json({
      database: status[dbStatus],
      databaseName: mongoose.connection.name,
      collections: collections.map(c => c.name),
      message: 'Database connection is working!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MONGODB CONNECTION =====
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB Connected successfully');
    console.log('📊 Database:', mongoose.connection.name);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

// ===== SOCKET.IO EVENT HANDLERS =====
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Socket ${socket.id} joined user room: ${userId}`);
  });

  socket.on('join-patient-room', (patientId) => {
    socket.join(`patient-${patientId}`);
    console.log(`Socket ${socket.id} joined room: patient-${patientId}`);
  });
  
  socket.on('join-doctors-room', () => {
    socket.join('doctors');
    console.log(`Socket ${socket.id} joined doctors room`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });


});


// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`📍 Network: http://10.39.163.152:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});