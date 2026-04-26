// routes/patients.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Reading = require('../models/Reading');
const Alert = require('../models/Alert'); 
const { protect, doctorOnly } = require('../middleware/auth');


// ============ PATIENT SELF-ACCESS ENDPOINTS ============
router.get('/user/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied. Patient only.' });
    }
    
    const patient = await User.findById(req.user.id).select('-password');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const recentReadings = await Reading.find({ patientId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    const totalReadings = await Reading.countDocuments({ patientId: req.user.id });
    
    const highRiskReadings = await Reading.countDocuments({ 
      patientId: req.user.id,
      riskLevel: { $in: ['high', 'critical'] }
    });
    
    const readingsForAvg = await Reading.find({ 
      patientId: req.user.id,
      pef_norm: { $ne: null }
    });
    
    let averagePef = '--';
    if (readingsForAvg.length > 0) {
      const totalPef = readingsForAvg.reduce((sum, r) => sum + (r.pef_norm || 0), 0);
      const avgPefDecimal = totalPef / readingsForAvg.length;
      averagePef = Math.round(avgPefDecimal * 100);
    }
    
    res.json({
      success: true,
      user: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        role: patient.role,
        age: patient.age,
        phone: patient.phone,
        personalBestPef: patient.personalBestPef,
        riskLevel: patient.riskLevel,
        riskScore: patient.riskScore,
        readingCount: patient.readingCount || totalReadings,
        lastReading: patient.lastReading,
        createdAt: patient.createdAt,
        doctorId: patient.doctorId
      },
      stats: {
        totalReadings,
        highRiskReadings,
        averagePef,
        recentReadings: recentReadings.map(r => ({
          id: r._id,
          riskLevel: r.riskLevel,
          riskScore: r.riskScore,
          timestamp: r.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/fcm', protect, async (req, res) => {
  try {
    const patient = await User.findByIdAndUpdate(
      req.params.id,
      { fcmToken: req.body.fcmToken },
      { new: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/me', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied. Patient only.' });
    }
    
    const allowedUpdates = ['name', 'phone', 'age', 'personalBestPef'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    const patient = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      user: patient,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating patient profile:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/me/personal-best', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Patient only' });
    }

    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
    
    const readings = await Reading.find({
      patientId: req.user.id,
      timestamp: { $gte: threeWeeksAgo },
      pef_norm: { $ne: null }
    }).sort({ pef_norm: -1 });

    if (readings.length === 0) {
      return res.json({
        success: false,
        message: 'Not enough readings. Please submit daily readings for 2-3 weeks.',
        requiredDays: 14,
        currentDays: readings.length
      });
    }

    const highestPefNorm = readings[0].pef_norm;
    let personalBestPef;
    const DEFAULT_PEF = 450; 
    if (req.user.personalBestPef && req.user.personalBestPef !== DEFAULT_PEF) {
      personalBestPef = Math.round(highestPefNorm * req.user.personalBestPef);
    } else {
      personalBestPef = Math.round(highestPefNorm * DEFAULT_PEF);
    }

    await User.findByIdAndUpdate(req.user.id, {
      personalBestPef: personalBestPef,
      personalBestStatus: 'calculated',
      personalBestLastCalculated: new Date(),
      personalBestReadings: readings.slice(0, 14).map(r => ({
        value: r.pef_norm,
        date: r.timestamp
      }))
    });

    res.json({
      success: true,
      personalBestPef: personalBestPef,
      message: `Your personal best PEF is ${personalBestPef} L/min`,
      readingsUsed: readings.length,
      highestReading: Math.round(highestPefNorm * personalBestPef)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me/personal-best-status', protect, async (req, res) => {
  try {
    const patient = await User.findById(req.user.id);
    const readingsLast3Weeks = await Reading.countDocuments({
      patientId: req.user.id,
      timestamp: { $gte: new Date(Date.now() - 21 * 86400000) }
    });

    let status = {
      hasPersonalBest: !!patient.personalBestPef,
      personalBestValue: patient.personalBestPef,
      status: patient.personalBestStatus,
      lastCalculated: patient.personalBestLastCalculated,
      readingsInLast3Weeks: readingsLast3Weeks,
      neededReadings: 14,
      isExpired: false
    };

    if (patient.personalBestLastCalculated) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      status.isExpired = patient.personalBestLastCalculated < sixMonthsAgo;
    }

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me/debug-readings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Patient only' });
    }
    
    const readings = await Reading.find({ 
      patientId: req.user.id 
    }).sort({ timestamp: -1 }).limit(10);
    
    const patient = await User.findById(req.user.id);
    
    res.json({
      readingCount: readings.length,
      personalBestPef: patient.personalBestPef,
      readings: readings.map(r => ({
        pef_norm: r.pef_norm,
        timestamp: r.timestamp,
        actualPef: patient.personalBestPef ? 
          Math.round(r.pef_norm * patient.personalBestPef) : 
          'unknown (no personal best)'
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me/readings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied. Patient only.' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    const readings = await Reading.find({ patientId: req.user.id })
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
    
    const total = await Reading.countDocuments({ patientId: req.user.id });
    
    res.json({
      success: true,
      readings,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching patient readings:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/me/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied. Patient only.' });
    }
    
    const readings = await Reading.find({ patientId: req.user.id });
    
    if (readings.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalReadings: 0,
          averageRiskScore: 0,
          riskLevelDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
          averagePef: 0,
          averageReliefUse: 0
        }
      });
    }
    
    const riskLevels = { low: 0, medium: 0, high: 0, critical: 0 };
    let totalRiskScore = 0;
    let totalPef = 0;
    let totalReliefUse = 0;
    
    readings.forEach(reading => {
      riskLevels[reading.riskLevel] = (riskLevels[reading.riskLevel] || 0) + 1;
      totalRiskScore += reading.riskScore || 0;
      totalPef += reading.pef_norm || 0;
      totalReliefUse += reading.relief_use || 0;
    });
    
    res.json({
      success: true,
      stats: {
        totalReadings: readings.length,
        averageRiskScore: (totalRiskScore / readings.length).toFixed(2),
        riskLevelDistribution: riskLevels,
        averagePef: ((totalPef / readings.length) * 100).toFixed(1),
        averageReliefUse: (totalReliefUse / readings.length).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============ DOCTOR-ONLY ENDPOINTS ============

// ✅ SPECIFIC ROUTES FIRST (before generic :id)

router.get('/available', protect, doctorOnly, async (req, res) => {
  console.log('🚨🚨🚨 /available endpoint was called! 🚨🚨🚨');
  
  try {
    console.log('📍 Doctor ID:', req.user?._id);
    console.log('📍 Doctor name:', req.user?.name);
    
    const availablePatients = await User.find({ 
      role: 'patient',
      doctorId: null
    }).select('-password');
    
    console.log(`✅ Found ${availablePatients.length} available patients`);
    console.log('Patients:', availablePatients.map(p => p.name));
    
    res.status(200).json(availablePatients);
    
  } catch (error) {
    console.error('❌ Error in /available:', error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, doctorOnly, async (req, res) => {
  try {
    console.log('🔍 Looking for patients with doctorId:', req.user._id);
    
    const patients = await User.find({ doctorId: req.user._id, role: 'patient' }).sort('-createdAt');
    
    // ✅ ADD THIS LINE TO SEE HOW MANY PATIENTS WERE FOUND
    console.log(`📊 Found ${patients.length} patients for doctor ${req.user.name}`);
    
    // ✅ ALSO LOG THE PATIENT NAMES
    if (patients.length > 0) {
      console.log('Patients:', patients.map(p => ({ name: p.name, id: p._id })));
    } else {
      console.log('⚠️ No patients found!');
      console.log('⚠️ Query:', { doctorId: req.user._id, role: 'patient' });
    }

    const stats = {
      total: patients.length,
      highRisk: patients.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
      critical: patients.filter(p => p.riskLevel === 'critical').length,
      avgRiskScore: patients.length > 0
        ? (patients.reduce((sum, p) => sum + (p.riskScore || 0), 0) / patients.length).toFixed(1)
        : 0
    };

    res.json({ patients, stats });
  } catch (error) {
    console.error('❌ Error in GET /patients:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ PENDING REQUEST - MUST COME BEFORE /:id
// GET /api/patients/:id/export – Export patient report as PDF/CSV
router.get('/:id/export', protect, doctorOnly, async (req, res) => {
  try {
    
    const patient = await User.findOne({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const readings = await Reading.find({ patientId: req.params.id }).sort({ timestamp: -1 });
    
    // Generate CSV report
    let csv = 'Date,Risk Level,Risk Score,PEF %,Reliever Use,Night Symptoms,Day Symptoms\n';
    
    readings.forEach(reading => {
      csv += `${new Date(reading.timestamp).toLocaleDateString()},`;
      csv += `${reading.riskLevel},`;
      csv += `${Math.round((reading.riskScore || 0) * 100)}%,`;
      csv += `${Math.round((reading.pef_norm || 0) * 100)}%,`;
      csv += `${reading.relief_use || 0},`;
      csv += `${reading.night_symptoms || 0},`;
      csv += `${reading.day_symptoms || 0}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=patient-${patient.name}-report.csv`);
    res.send(csv);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: error.message });
  }
});
router.get('/pending-request', protect, async (req, res) => {
  try {
    console.log('📍 Pending request check for user:', req.user._id);
    console.log('User role:', req.user.role);
    
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied. Patient only.' });
    }
    
    const patient = await User.findById(req.user.id)
      .populate('doctorRequested', 'name specialty email phone');
    
    if (patient.doctorRequestStatus === 'pending' && patient.doctorRequested) {
      res.json({
        hasPendingRequest: true,
        doctor: patient.doctorRequested,
        requestDate: patient.doctorRequestDate
      });
    } else {
      res.json({ hasPendingRequest: false });
    }
  } catch (error) {
    console.error('Error checking pending request:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ /:id/alerts BEFORE /:id
router.get('/:id/alerts', protect, doctorOnly, async (req, res) => {
  try {
    
    const alerts = await Alert.find({ patientId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ /:id/readings BEFORE /:id
router.get('/:id/readings', protect, doctorOnly, async (req, res) => {
  try {
    const readings = await Reading.find({ patientId: req.params.id }).sort('-timestamp').limit(50);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GENERIC /:id route LAST (catch-all)
router.get('/:id', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.create({
      ...req.body,
      doctorId: req.user._id,
      role: 'patient',
      password: req.body.password || 'defaultPass123',
    });
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, doctorOnly, async (req, res) => {
  try {
    let patient = await User.findOne({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    patient = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/patients/:id – doctor removes a patient from their list (does NOT delete the patient account)
router.delete('/:id', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found under your care' });
    }

    // ✅ Remove association ONLY - don't delete the patient account
    patient.doctorId = null;
    patient.doctorRequested = null;
    patient.doctorRequestStatus = 'none';
    patient.doctorRequestDate = null;
    await patient.save();

    res.json({ 
      success: true,
      message: 'Patient removed from your list. The patient account remains active.'
    });
  } catch (error) {
    console.error('Error removing patient:', error);
    res.status(500).json({ message: error.message });
  }
});
// DELETE /api/patients/:id/permanent – permanently delete patient account (ADMIN ONLY)
router.delete('/:id/permanent', protect, async (req, res) => {
  try {
    // Check if user is admin (you may need to add admin role)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const patient = await User.findByIdAndDelete(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Also delete all readings and alerts for this patient
    await Reading.deleteMany({ patientId: req.params.id });
    await Alert.deleteMany({ patientId: req.params.id });
    
    res.json({ message: 'Patient account permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post('/request/:patientId', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOne({ 
      _id: req.params.patientId, 
      role: 'patient' 
    });
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    if (patient.doctorId) {
      return res.status(400).json({ message: 'Patient already has a doctor' });
    }
    
    if (patient.doctorRequestStatus === 'pending') {
      return res.status(400).json({ message: 'A request is already pending for this patient' });
    }
    
    patient.doctorRequested = req.user._id;
    patient.doctorRequestStatus = 'pending';
    patient.doctorRequestDate = new Date();
    await patient.save();
    
    const io = req.app.get('io');
    if (io) {
      io.to(`patient-${patient._id}`).emit('doctor_request', {
        doctorId: req.user._id,
        doctorName: req.user.name,
        doctorSpecialty: req.user.specialty,
        requestDate: patient.doctorRequestDate
      });
    }
    
    res.json({ 
      success: true, 
      message: `Request sent to ${patient.name}`,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/respond-request/:doctorId', protect, async (req, res) => {
  try {
    const { action } = req.body;
    const patient = await User.findById(req.user.id);
    const doctor = await User.findById(req.params.doctorId);
    
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    if (patient.doctorRequestStatus !== 'pending' || patient.doctorRequested?.toString() !== doctor._id.toString()) {
      return res.status(400).json({ message: 'No pending request from this doctor' });
    }
    
    if (action === 'accept') {
      patient.doctorId = doctor._id;
      patient.doctorRequestStatus = 'accepted';
      patient.doctorRequested = null;
      await patient.save();
      
      const io = req.app.get('io');
      if (io) {
        io.to('doctors').emit('patient_added', {
          patientId: patient._id,
          patientName: patient.name,
          doctorId: doctor._id
        });
      }
      
      res.json({ 
        success: true, 
        message: `You are now connected with Dr. ${doctor.name}`,
        doctor: {
          id: doctor._id,
          name: doctor.name,
          specialty: doctor.specialty,
          email: doctor.email
        }
      });
    } else {
      patient.doctorRequestStatus = 'rejected';
      patient.doctorRequested = null;
      await patient.save();
      
      res.json({ 
        success: true, 
        message: `Request from Dr. ${doctor.name} rejected` 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/readings', protect, doctorOnly, async (req, res) => {
  try {
    const reading = await Reading.create({ ...req.body, patientId: req.params.id });
    const io = req.app.get('io');
    if (io) io.to(`patient-${req.params.id}`).emit('new-reading', reading);
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;