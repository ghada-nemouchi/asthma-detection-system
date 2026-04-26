const express = require('express');
const router = express.Router();
const axios = require('axios');
const Reading = require('../models/Reading');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { protect } = require('../middleware/auth');
const { notifyEmergencyContacts } = require('../services/notificationService');
const FLASK_URL = process.env.FLASK_URL || 'http://localhost:5001';

// ============ HELPER FUNCTIONS ============

const calculateRollingSum = async (patientId, days, field, currentReadingTimestamp) => {
    const cutoff = new Date(currentReadingTimestamp);
    cutoff.setDate(cutoff.getDate() - days);
    const readings = await Reading.find({
        patientId,
        timestamp: { $gte: cutoff, $lt: new Date(currentReadingTimestamp) }
    });
    return readings.reduce((sum, r) => sum + (r[field] || 0), 0);
};

const calculateRollingDays = async (patientId, days, currentReadingTimestamp) => {
    const cutoff = new Date(currentReadingTimestamp);
    cutoff.setDate(cutoff.getDate() - days);
    const readings = await Reading.find({
        patientId,
        timestamp: { $gte: cutoff, $lt: new Date(currentReadingTimestamp) },
        relief_use: { $gt: 0 }
    });
    return readings.length;
};

const calculatePefSlope = async (patientId, days, currentReadingTimestamp) => {
    const cutoff = new Date(currentReadingTimestamp);
    cutoff.setDate(cutoff.getDate() - days);
    const readings = await Reading.find({
        patientId,
        timestamp: { $gte: cutoff, $lt: new Date(currentReadingTimestamp) },
        pef_norm: { $ne: null }
    }).sort({ timestamp: 1 });

    if (readings.length < 2) return 0;

    const n = readings.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    readings.forEach((reading, idx) => {
        const x = idx;
        const y = reading.pef_norm * 100;
        sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    });
    const denom = (n * sumX2 - sumX * sumX);
    return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
};

const calculateSymptomScore = (nightSymptoms, daySymptoms, reliefUse) => {
    let score = 0;
    if (daySymptoms > 2) score++;
    if (nightSymptoms > 0) score++;
    if (reliefUse > 2) score++;
    return score;
};

const calculatePefDropAfterRescue = async (patientId, currentReadingTimestamp, currentPefNorm, currentReliefUse) => {
    if (currentReliefUse === 0) return 0;
    const previousReading = await Reading.findOne({
        patientId,
        timestamp: { $lt: currentReadingTimestamp }
    }).sort({ timestamp: -1 });
    if (!previousReading || !previousReading.pef_norm) return 0;
    const drop = previousReading.pef_norm - currentPefNorm;
    if (drop <= 0) return 0;
    return Math.min((drop / previousReading.pef_norm) * 100, 100);
};

// ============ ROUTES ============

// POST /api/readings – submit a daily reading (patient only)
router.post('/', protect, async (req, res) => {
    try {
        const patientId = req.user.id;
        const {
            night_symptoms,
            day_symptoms,
            pef,                    // ✅ This is the actual PEF value in L/min from frontend
            relief_use,
            steps,
            mean_hr,
            sleep_minutes,
            temperature,
            aqi,
            hasCold
        } = req.body;

        if (night_symptoms === undefined || day_symptoms === undefined ||
            pef === undefined || relief_use === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: night_symptoms, day_symptoms, pef, relief_use'
            });
        }

        const patient = await User.findById(patientId);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        // ✅ FIXED: Use the pef value from req.body
        const personalBest = patient.personalBestPef || 450;  // Default to 450 L/min
        const pef_norm = Math.min(pef / personalBest, 1.0);   // Now 'pef' is defined!
        
        const baselineHr = patient.baselineHr || 70;
        const baselineSteps = patient.baselineSteps || 5000;
        const now = new Date();

        // Build the 12 features that the ML model expects
        const mlInput = {
            pef_pct_pb:        pef_norm * 100,
            pef_slope_3d:      await calculatePefSlope(patientId, 3, now),
            rescue_puffs:      relief_use,
            rescue_used:       relief_use > 0 ? 1 : 0,
            rescue_roll3_sum:  await calculateRollingSum(patientId, 3, 'relief_use', now),
            rescue_roll3_days: await calculateRollingDays(patientId, 3, now),
            symptom_score:     calculateSymptomScore(night_symptoms, day_symptoms, relief_use),
            hr_pct_bl:         mean_hr ? (mean_hr / baselineHr) * 100 : 100,
            steps_pct_bl:      steps  ? (steps  / baselineSteps) * 100 : 100,
            pef_drop_rescue:   await calculatePefDropAfterRescue(patientId, now, pef_norm, relief_use),
            pollen_enc:        Math.min(Math.max(Math.ceil((aqi || 50) / 50), 1), 4),
            cold_flag:         hasCold ? 1 : 0
        };

        // Call Flask ML service
        let mlRisk = 0.3;
        let mlLevel = 'low';
        try {
            const flaskRes = await axios.post(`${FLASK_URL}/predict`, mlInput, { timeout: 5000 });
            mlRisk  = flaskRes.data.riskScore;
            mlLevel = flaskRes.data.riskLevel;
        } catch (err) {
            console.error('ML service unavailable, using rule-based fallback:', err.message);
        }

        // ✅ DEBUG LOGS
        console.log('📊 ML Risk:', mlRisk, 'ML Level:', mlLevel);
        console.log('📊 PEF value:', pef, 'Personal Best:', personalBest, 'PEF norm:', pef_norm);
        console.log('📊 Relief use:', relief_use);
        console.log('📊 Night symptoms:', night_symptoms, 'Day symptoms:', day_symptoms);

        // GINA rule-based safety overrides (always applied on top of ML)
        let finalLevel = mlLevel;
        
        // FORCE LOW for truly healthy readings (override ML model)
        if (pef_norm >= 0.8 && relief_use <= 1 && night_symptoms === 0 && day_symptoms === 0) {
            finalLevel = 'low';
            console.log('✅ FORCED LOW: Patient appears healthy despite ML prediction');
        }
        // Otherwise, proceed with normal GINA rules
        else if (pef_norm < 0.6 || relief_use > 6) {
            finalLevel = 'critical';
        } else if (relief_use > 2 || night_symptoms > 0) {
            if (finalLevel !== 'critical') finalLevel = 'high';
        } else if (day_symptoms > 0 || mlRisk > 0.6) {
            if (finalLevel === 'low') finalLevel = 'medium';
        }

        console.log('📊 Final level after GINA:', finalLevel);

        // ✅ Save reading with pef_norm only (as your schema requires)
        const reading = new Reading({
            patientId,
            night_symptoms,
            day_symptoms,
            pef_norm,                    // ✅ Store normalized value
            relief_use,
            steps:         steps         || 0,
            mean_hr:       mean_hr       || 0,
            sleep_minutes: sleep_minutes || 0,
            temperature:   temperature   || 0,
            aqi:           aqi           || 0,
            riskScore:     mlRisk,
            riskLevel:     finalLevel,
        });
        await reading.save();

        // Update patient's latest risk snapshot
        await User.findByIdAndUpdate(patientId, {
            riskLevel:  finalLevel,
            riskScore:  mlRisk,
            lastReading: now,
            $inc: { readingCount: 1 },
            ...(mean_hr && !patient.baselineHr   && { baselineHr:    mean_hr }),
            ...(steps  && !patient.baselineSteps && { baselineSteps: steps   }),
        });
        // 🚨 TRIGGER EMERGENCY NOTIFICATIONS IF CRITICAL
        if (finalLevel === 'critical') {
            console.log('🚨 CRITICAL RISK DETECTED! Notifying emergency contacts...');
            await notifyEmergencyContacts(patientId, {
                pef: pef,
                relief_use: relief_use,
                night_symptoms: night_symptoms,
                day_symptoms: day_symptoms,
                pef_norm: pef_norm
            });
        }
        // Alert doctor if high / critical AND send push notification
        if (finalLevel === 'high' || finalLevel === 'critical') {
            const alert = new Alert({
                patientId,
                readingId: reading._id,
                riskLevel: finalLevel,
                riskScore: mlRisk,
                message: finalLevel === 'critical'
                    ? 'CRITICAL risk: Immediate attention needed'
                    : 'HIGH risk: Monitor closely'
            });
            await alert.save();

            // Socket.io to doctor dashboard
            const io = req.app.get('io');
            if (io) {
                io.to('doctors').emit('new_alert', {
                    patientId,
                    patientName: patient.name,
                    alert: {
                        _id:       alert._id,
                        riskLevel: finalLevel,
                        riskScore: mlRisk,
                        message:   alert.message,
                        createdAt: alert.createdAt
                    }
                });
            }
            
            // PUSH NOTIFICATION to patient's phone
            if (patient.fcmToken) {
                const fetch = require('node-fetch');
                await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: patient.fcmToken,
                        title: finalLevel === 'critical' ? '🚨 CRITICAL ALERT' : '⚠️ High Risk Alert',
                        body: finalLevel === 'critical' 
                            ? 'Immediate attention needed! Take rescue inhaler.'
                            : 'Your risk level is high. Monitor symptoms closely.',
                        data: { riskLevel: finalLevel, riskScore: mlRisk }
                    })
                });
                console.log('📱 Push notification sent to patient');
            }
        }

        res.status(201).json({
            success: true,
            reading,
            riskScore: mlRisk,
            riskLevel: finalLevel,
        });

    } catch (err) {
        console.error('Reading submission error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /api/readings/patient/me – logged-in patient's own history
router.get('/patient/me', protect, async (req, res) => {
    try {
        const readings = await Reading.find({ patientId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(readings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/readings/patient/:patientId – doctor views a patient's readings
router.get('/patient/:patientId', protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        if (req.user.role !== 'doctor' && req.user.id !== patientId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const readings = await Reading.find({ patientId })
            .sort({ timestamp: -1 })
            .limit(30);
        res.json(readings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;