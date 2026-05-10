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
app.use(express.json({ limit: '50mb' }));  // ← ADD THIS - increase JSON limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== AI SERVICE PROXY =====
const AI_SERVICE_URL = 'http://localhost:5001'; // Your Python AI service

// Endpoint for audio analysis
// In server.js - Replace the /api/analyze-audio endpoint

// Endpoint for audio analysis
app.post('/api/analyze-audio', async (req, res) => {
    try {
        const { audio_base64 } = req.body;
        
        console.log('🎤 Received audio analysis request');
        console.log('📊 Audio base64 length:', audio_base64?.length || 0);
        
        if (!audio_base64) {
            return res.status(400).json({ 
                error: 'No audio data provided',
                severity: 'error',
                asthma_probability: 0,
                confidence: 0,
                message: 'Please provide audio data'
            });
        }
        
        // Check if AI service is reachable first
        try {
            const healthCheck = await fetch('http://localhost:5001/health-audio', {
                method: 'GET',
                timeout: 3000
            });
            if (!healthCheck.ok) {
                throw new Error('AI service health check failed');
            }
            console.log('✅ AI service is healthy');
        } catch (healthError) {
            console.error('❌ AI service health check failed:', healthError.message);
            return res.status(503).json({ 
                error: 'AI service unavailable',
                severity: 'error',
                asthma_probability: 0,
                confidence: 0,
                message: 'The asthma detection service is starting up. Please try again in a moment.',
                details: 'AI service not responding'
            });
        }
        
        // Forward to Python AI service with longer timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
        
        const response = await fetch('http://localhost:5001/predict-asthma-audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ audio_base64: audio_base64 }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ AI service error response:', response.status, errorText);
            throw new Error(`AI service responded with status ${response.status}: ${errorText.substring(0, 200)}`);
        }
        
        const result = await response.json();
        console.log('✅ Audio analysis complete:', result);
        
        // Forward the result back to mobile app
        res.json(result);
        
    } catch (error) {
        console.error('❌ Error in audio analysis proxy:', error.message);
        
        // Determine if it's a timeout or connection error
        let errorMessage = 'Audio analysis service is temporarily unavailable.';
        if (error.name === 'AbortError') {
            errorMessage = 'Analysis timed out. Please try a shorter recording (5-10 seconds).';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to analysis service. Please ensure the Python AI service is running on port 5001.';
        }
        
        res.status(500).json({ 
            error: 'Analysis service unavailable',
            severity: 'error',
            asthma_probability: 0,
            confidence: 0,
            message: errorMessage,
            details: error.message
        });
    }
});

// Test endpoint to check if AI service is reachable
app.get('/api/ai-health', async (req, res) => {
    try {
        const response = await fetch('http://localhost:5001/health', {
            timeout: 5000
        });
        const data = await response.json();
        res.json({ status: 'ok', ai_service: 'connected', ...data });
    } catch (error) {
        res.status(503).json({ 
            status: 'error', 
            ai_service: 'disconnected',
            message: 'AI service is not running'
        });
    }
});

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
  console.log(`📍 AI Service Health: http://localhost:${PORT}/api/ai-health`);
});