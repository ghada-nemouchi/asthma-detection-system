const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const os = require('os');

const app = express();
const server = http.createServer(app);

// ===== GET CORRECT LOCAL IP ADDRESS =====
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (localhost) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`📡 Found network interface: ${name} -> ${iface.address}`);
        return iface.address;
      }
    }
  }
   // Fallback to localhost if no network interface found
  console.log('⚠️ No network interface found, falling back to localhost');
  return 'localhost';
};

// Get the actual IP address
const LOCAL_IP = getLocalIpAddress();
console.log(`✅ Detected local IP address: ${LOCAL_IP}`);

// ===== IMPORT ROUTES =====
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const readingRoutes = require('./routes/readings');
const alertRoutes = require('./routes/alerts');
const environmentalRoutes = require('./routes/environmental');
const emergencyContactsRoutes = require('./routes/emergencyContacts');
const medicationRoutes = require('./routes/medications');
const messageRoutes = require('./routes/messages');
const guidelineRoutes = require('./routes/guidelines');
// ===== SOCKET.IO SETUP =====
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', '*', `http://${LOCAL_IP}:3000`],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ===== MIDDLEWARE (ORDER MATTERS!) =====
// 1. CORS first
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', '*', `http://${LOCAL_IP}:3000`],
  credentials: true,
}));

// 2. Body parsers
app.use(express.json({ limit: '50mb' }));  // ←- increase JSON limit
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/guidelines', guidelineRoutes);
// ===== AI SERVICE PROXY =====
// Use the detected IP address for AI service
const AI_SERVICE_URL = `http://${LOCAL_IP}:5001`; // Your Python AI service
console.log(`🤖 AI Service URL: ${AI_SERVICE_URL}`);

// ===== NEW: UNIFIED SCREENING ENDPOINT (Audio + Questionnaire) =====
app.post('/api/unified-screening', async (req, res) => {
  try {
    const { audio_base64, questionnaire_answers } = req.body;
    
    console.log('🎤 Received unified screening request');
    console.log('📊 Audio present:', !!audio_base64);
    console.log('📋 Questionnaire answers:', questionnaire_answers ? Object.keys(questionnaire_answers).length : 0);
    
    let audioResult = null;
    let questionnaireScore = null;
    
    // 1. Process audio if provided
    if (audio_base64) {
      try {
        // Check AI service health
        const healthCheck = await fetch(`${AI_SERVICE_URL}/health-audio`, {
          method: 'GET',
          timeout: 3000
        });
        
        if (healthCheck.ok) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);
          
          const response = await fetch(`${AI_SERVICE_URL}/predict-asthma-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio_base64: audio_base64 }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            audioResult = await response.json();
            console.log('✅ Audio analysis complete:', audioResult.asthma_probability);
          }
        }
      } catch (audioError) {
        console.error('⚠️ Audio analysis failed:', audioError.message);
        // Continue with questionnaire only
      }
    }
    
    // 2. Process questionnaire if provided
    if (questionnaire_answers) {
      questionnaireScore = calculateQuestionnaireScore(questionnaire_answers);
      console.log('✅ Questionnaire score:', questionnaireScore);
    }
    
    // 3. Calculate unified score
    const unifiedResult = calculateUnifiedScore(audioResult, questionnaireScore);
    
    console.log('🎯 Unified result:', unifiedResult);
    res.json(unifiedResult);
    
  } catch (error) {
    console.error('❌ Unified screening error:', error);
    res.status(500).json({
      error: 'Screening failed',
      severity: 'error',
      final_score: 50,
      message: 'Unable to complete screening. Please try again.'
    });
  }
});

// ===== NEW: QUESTIONNAIRE ONLY ENDPOINT =====
app.post('/api/questionnaire-screening', async (req, res) => {
  try {
    const { questionnaire_answers } = req.body;
    
    if (!questionnaire_answers) {
      return res.status(400).json({ error: 'No questionnaire answers provided' });
    }
    
    const questionnaireScore = calculateQuestionnaireScore(questionnaire_answers);
    const result = interpretScore(questionnaireScore, 'questionnaire');
    
    console.log('📋 Questionnaire screening result:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Questionnaire screening error:', error);
    res.status(500).json({ error: 'Failed to process questionnaire' });
  }
});

// ===== NEW: AUDIO ONLY ENDPOINT (updated thresholds) =====
app.post('/api/analyze-audio', async (req, res) => {
  try {
    const { audio_base64 } = req.body;
    
    console.log('🎤 Received audio analysis request');
    
    if (!audio_base64) {
      return res.status(400).json({ 
        error: 'No audio data provided',
        severity: 'error',
        asthma_probability: 0,
        confidence: 0,
        message: 'Please provide audio data'
      });
    }
    
    // Check AI service health
    try {
      const healthCheck = await fetch(`${AI_SERVICE_URL}/health-audio`, {
        method: 'GET',
        timeout: 3000
      });
      if (!healthCheck.ok) throw new Error('AI service health check failed');
    } catch (healthError) {
      return res.status(503).json({ 
        error: 'AI service unavailable',
        severity: 'error',
        asthma_probability: 0,
        confidence: 0,
        message: 'The asthma detection service is starting up. Please try again in a moment.'
      });
    }
    
    // Forward to Python AI service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    const response = await fetch(`${AI_SERVICE_URL}/predict-asthma-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audio_base64 }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }
    
    const aiResult = await response.json();
    const result = interpretAudioResult(aiResult);
    
    console.log('✅ Audio analysis complete:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Audio analysis error:', error.message);
    res.status(500).json({ 
      error: 'Analysis service unavailable',
      severity: 'error',
      asthma_probability: 0,
      confidence: 0,
      message: 'Audio analysis failed. Please try again.'
    });
  }
});

// ===== HELPER FUNCTIONS =====

// Calculate NHANES questionnaire score
function calculateQuestionnaireScore(answers) {
  const questions = [
    { id: 'wheezing', weight: 3, reverse: false },
    { id: 'asthma_diagnosis', weight: 3, reverse: false },
    { id: 'night_symptoms', weight: 2, reverse: false },
    { id: 'exercise_trigger', weight: 2, reverse: false },
    { id: 'family_history', weight: 2, reverse: false },
    { id: 'smoking', weight: 1, reverse: true },
    { id: 'rescue_use', weight: 2, reverse: false }
  ];
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  questions.forEach(q => {
    const answer = answers[q.id];
    if (answer !== undefined) {
      totalWeight += q.weight;
      if (answer === true) {
        weightedScore += q.reverse ? 0 : q.weight;
      } else {
        weightedScore += q.reverse ? q.weight : 0;
      }
    }
  });
  
  if (totalWeight === 0) return 50;
  return (weightedScore / totalWeight) * 100;
}

// Calculate unified score (60% audio, 40% questionnaire)
function calculateUnifiedScore(audioResult, questionnaireScore) {
  let audioScore = 50; // Default if no audio
  
  if (audioResult && audioResult.asthma_probability) {
    audioScore = audioResult.asthma_probability * 100;
  }
  
  let finalScore = audioScore;
  let source = 'audio';
  
  if (questionnaireScore !== null) {
    if (audioResult && audioResult.asthma_probability) {
      // Both available: 60% audio, 40% questionnaire
      finalScore = (audioScore * 0.6) + (questionnaireScore * 0.4);
      source = 'combined';
    } else {
      // Only questionnaire
      finalScore = questionnaireScore;
      source = 'questionnaire';
    }
  }
  
  return interpretScore(finalScore, source);
}

//========= Interpret score into severity and recommendations

function interpretBinaryScore(score, source, isAsthmatic) {
  let classification, message, recommendations;
  
  if (isAsthmatic) {
    classification = 'asthma';
    message = 'Asthmatic indicators detected. Please consult a healthcare provider.';
    recommendations = [
      'Schedule an appointment with a pulmonologist',
      'Complete pulmonary function testing',
      'Keep a symptom diary',
      'Avoid known respiratory triggers'
    ];
  } else {
    classification = 'healthy';
    message = 'No asthmatic indicators detected. Breathing pattern appears normal.';
    recommendations = [
      'Continue healthy lifestyle habits',
      'Regular physical activity',
      'Re-screen annually or if symptoms develop'
    ];
  }
  
  return {
    final_score: Math.round(score),
    is_asthmatic: isAsthmatic,
    classification: classification,
    message: message,
    source: source,
    recommendations: recommendations
  };
}
// function interpretScore(score, source) {
//   let severity, message, recommendations;
  
//   if (score >= 70) {
//     severity = 'high';
//     message = 'High probability of asthma. Please consult a healthcare provider.';
//     recommendations = [
//       'Schedule an appointment with a pulmonologist',
//       'Complete pulmonary function testing',
//       'Avoid known respiratory triggers',
//       'Keep a symptom diary'
//     ];
//   } else if (score >= 40) {
//     severity = 'moderate';
//     message = 'Moderate probability. Further evaluation recommended.';
//     recommendations = [
//       'Monitor symptoms for 2-4 weeks',
//       'Consider follow-up with primary care provider',
//       'Avoid smoke and air pollution',
//       'Re-test in 3 months'
//     ];
//   } else if (score >= 20) {
//     severity = 'mild';
//     message = 'Mild suspicion. Continue monitoring.';
//     recommendations = [
//       'Maintain healthy lifestyle',
//       'Regular exercise to improve lung health',
//       'Avoid smoking and secondhand smoke',
//       'Annual check-up recommended'
//     ];
//   } else {
//     severity = 'low';
//     message = 'Low probability. You appear healthy!';
//     recommendations = [
//       'Continue healthy lifestyle habits',
//       'Regular physical activity',
//       'Stay up to date with vaccinations',
//       'Re-screen annually or if symptoms develop'
//     ];
//   }
  
//   return {
//     final_score: Math.round(score),
//     severity: severity,
//     message: message,
//     source: source,
//     recommendations: recommendations,
//     requires_followup: severity !== 'low'
//   };
// }

// =================Interpret audio-only result
// Interpret audio-only result - BINARY (Asthma vs No Asthma)
function interpretAudioResult(aiResult) {
  const probability = aiResult.asthma_probability || 0;
  
  // THRESHOLD ADJUSTED: 0.20 to catch your 0.32 asthma patients
  // Normal people are <0.09, Asthma patients are >=0.32
  const ASTHMA_THRESHOLD = 0.32;
  
  let severity, message, isAsthma;
  
  if (probability >= ASTHMA_THRESHOLD) {
    isAsthma = true;
    severity = 'asthma';
    message = 'Asthmatic breathing pattern detected. Please consult a healthcare provider.';
  } else {
    isAsthma = false;
    severity = 'healthy';
    message = 'No asthmatic pattern detected. Breathing sounds normal.';
  }
  
  return {
    asthma_probability: probability,
    is_asthmatic: isAsthma,
    classification: severity,
    message: message,
    confidence: aiResult.confidence || 0.8,
    recommendation: isAsthma ? 'Schedule a pulmonary evaluation' : 'Continue healthy lifestyle'
  };
}
// function interpretAudioResult(aiResult) {
//   const probability = aiResult.asthma_probability || 0;
  
//   let severity, message;
  
//   if (probability >= 0.3) {
//     severity = 'high';
//     message = 'High probability detected. Please consult a doctor.';
//   } else if (probability >= 0.4) {
//     severity = 'moderate';
//     message = 'Moderate probability. Further evaluation recommended.';
//   } else if (probability >= 0.2) {
//     severity = 'mild';
//     message = 'Mild suspicion. Monitor your symptoms.';
//   } else {
//     severity = 'low';
//     message = 'Low probability. You appear healthy!';
//   }
  
//   return {
//     asthma_probability: probability,
//     severity: severity,
//     message: message,
//     confidence: aiResult.confidence || 0.8,
//     next_action: severity === 'high' ? 'consult_doctor' : 'monitor'
//   };
// }

// Test endpoint to check if AI service is reachable
app.get('/api/ai-health', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/health`, {
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
  console.log(`📍 Network: http://${LOCAL_IP}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 AI Service Health: http://localhost:${PORT}/api/ai-health`);
  console.log(`📍 Unified Screening: http://localhost:${PORT}/api/unified-screening`);
  console.log(`📍 Questionnaire Only: http://localhost:${PORT}/api/questionnaire-screening`);
  console.log(`📍 AI Service URL: ${AI_SERVICE_URL}`); 
});