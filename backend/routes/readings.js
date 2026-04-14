const express = require('express');
const router = express.Router();
const axios = require('axios');
const Reading = require('../models/Reading');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');

const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

// POST /api/readings – submit a daily reading (patient only)
router.post('/', protect, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { 
      night_symptoms,    // number 0..7
      day_symptoms,      // number 0..7
      pef,               // raw PEF value (L/min)
      relief_use,        // times per week
      steps, mean_hr, sleep_minutes, temperature, aqi 
    } = req.body;

    // Validate required fields
    if (night_symptoms === undefined || day_symptoms === undefined || pef === undefined || relief_use === undefined) {
      return res.status(400).json({ error: 'Missing required fields: night_symptoms, day_symptoms, pef, relief_use' });
    }

    // Get patient's personal best PEF
    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const personalBest = patient.personalBestPef || 400;
    const pef_norm = Math.min(pef / personalBest, 1.0);

    // Prepare input for Flask ML (ordinal values, not binary)
    const mlInput = {
      night_symptoms: Number(night_symptoms),
      day_symptoms: Number(day_symptoms),
      pef_norm: pef_norm,
      relief_use: Number(relief_use)
    };

    // Call Flask ML service
    let mlRisk = 0.5;
    let mlLevel = 'low';
    try {
      const flaskRes = await axios.post(`${FLASK_URL}/predict`, mlInput, { timeout: 5000 });
      mlRisk = flaskRes.data.riskScore;
      mlLevel = flaskRes.data.riskLevel;
    } catch (err) {
      console.error('ML service error:', err.message);
      // fallback: rule-based only
    }

    // GINA rule-based overrides (clinical safety net)
    let finalLevel = mlLevel;
    if (pef_norm < 0.6 || relief_use > 6) {
      finalLevel = 'critical';
    } else if (relief_use > 2 || night_symptoms > 0) {
      finalLevel = 'high';
    } else if (day_symptoms > 0 || mlRisk > 0.6) {
      finalLevel = 'medium';
    }

    // Save reading
    const reading = new Reading({
      patientId,
      night_symptoms: mlInput.night_symptoms,
      day_symptoms: mlInput.day_symptoms,
      pef_norm,
      relief_use: mlInput.relief_use,
      steps, mean_hr, sleep_minutes, temperature, aqi,
      riskScore: mlRisk,
      riskLevel: finalLevel
    });
    await reading.save();

    // Update patient's latest risk info
    await User.findByIdAndUpdate(patientId, {
      riskLevel: finalLevel,
      riskScore: mlRisk,
      lastReading: new Date()
    });

    // If high/critical → create alert, push notification, and socket.io
    if (finalLevel === 'high' || finalLevel === 'critical') {
      const alert = new Alert({
        patientId,
        readingId: reading._id,
        riskLevel: finalLevel,
        riskScore: mlRisk,
        message: `${finalLevel.toUpperCase()} risk: ${finalLevel === 'critical' ? 'Immediate attention needed' : 'Monitor closely'}`
      });
      await alert.save();

      // Emit real-time alert to doctor dashboard (all doctors listening to 'doctors' room)
      const io = req.app.get('io');
      io.to('doctors').emit('new_alert', {
        patientId,
        patientName: patient.name,
        alert: {
          _id: alert._id,
          riskLevel: finalLevel,
          riskScore: mlRisk,
          message: alert.message,
          createdAt: alert.createdAt
        }
      });

      // TODO: Send push notification via Firebase using patient.fcmToken
      // if (patient.fcmToken) { ... }
    }

    res.status(201).json(reading);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/readings/patient/me – get readings for the logged-in patient
router.get('/patient/me', protect, async (req, res) => {
  try {
    const patientId = req.user.id;
    const readings = await Reading.find({ patientId }).sort({ timestamp: -1 }).limit(50);
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/readings/patient/:patientId – get readings for a patient (doctor or patient themselves)
router.get('/patient/:patientId', protect, async (req, res) => {
  try {
    const { patientId } = req.params;
    // Allow access if requester is the patient or a doctor
    if (req.user.role !== 'doctor' && req.user.id !== patientId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const readings = await Reading.find({ patientId }).sort({ timestamp: -1 }).limit(30);
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;