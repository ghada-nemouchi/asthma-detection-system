// routes/patients.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Reading = require('../models/Reading');
const { protect, doctorOnly } = require('../middleware/auth');

// ============ PATIENT SELF-ACCESS ENDPOINTS ============
// Add this endpoint to get any user by ID (for doctor info)
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
// GET /api/patients/me – Patient gets their own profile
router.get('/me', protect, async (req, res) => {
  try {
    // Only patients can access their own profile
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Access denied. Patient only.' });
    }
    
    const patient = await User.findById(req.user.id).select('-password');
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Get recent readings for stats
    const recentReadings = await Reading.find({ patientId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Calculate total readings count
    const totalReadings = await Reading.countDocuments({ patientId: req.user.id });
    
    // Calculate high risk readings count
    const highRiskReadings = await Reading.countDocuments({ 
      patientId: req.user.id,
      riskLevel: { $in: ['high', 'critical'] }
    });
    
    // Calculate average PEF percentage
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

// PUT /api/patients/me – Patient updates their own profile
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

// GET /api/patients/me/readings – Patient gets their own readings
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

// GET /api/patients/me/stats – Patient gets their statistics
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

// GET /api/patients/available - MUST COME BEFORE /:id !
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
// GET /api/patients/pending-request - Patient checks pending doctor request
router.get('/pending-request', protect, async (req, res) => {
  try {
    console.log('📍 Pending request check for user:', req.user._id);
    console.log('User role:', req.user.role);
    
    // Only patients can access this
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
// GET /api/patients – all patients for the logged-in doctor
router.get('/', protect, doctorOnly, async (req, res) => {
  try {
    const patients = await User.find({ doctorId: req.user._id, role: 'patient' }).sort('-createdAt');

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
    res.status(500).json({ message: error.message });
  }
});

// GET /api/patients/:id – single patient (doctor only) - MUST COME AFTER /available
router.get('/:id', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/patients – doctor creates a patient account
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

// PUT /api/patients/:id – doctor updates a patient
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

// DELETE /api/patients/:id – doctor removes a patient
router.delete('/:id', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOneAndDelete({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/patients/:id/readings – doctor views patient's readings
router.get('/:id/readings', protect, doctorOnly, async (req, res) => {
  try {
    const readings = await Reading.find({ patientId: req.params.id }).sort('-timestamp').limit(50);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/patients/request/:patientId - Doctor requests to add a patient
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

// POST /api/patients/respond-request/:doctorId - Patient accepts/rejects doctor request
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



// POST /api/patients/:id/readings – doctor manually adds a reading
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