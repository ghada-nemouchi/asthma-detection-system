const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Reading = require('../models/Reading');
const { protect, doctorOnly } = require('../middleware/auth');

// Get all patients for a doctor
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

// Get single patient
router.get('/:id', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOne({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create patient (doctor adds a patient)
router.post('/', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.create({
      ...req.body,
      doctorId: req.user._id,
      role: 'patient',
      password: req.body.password || 'defaultPass123', // should be hashed; in real app force change
    });
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update patient
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

// Delete patient
router.delete('/:id', protect, doctorOnly, async (req, res) => {
  try {
    const patient = await User.findOneAndDelete({ _id: req.params.id, doctorId: req.user._id, role: 'patient' });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get patient readings
router.get('/:id/readings', protect, doctorOnly, async (req, res) => {
  try {
    const readings = await Reading.find({ patientId: req.params.id }).sort('-timestamp').limit(50);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reading for patient (doctor can add manually)
router.post('/:id/readings', protect, doctorOnly, async (req, res) => {
  try {
    const reading = await Reading.create({ ...req.body, patientId: req.params.id });
    const io = req.app.get('io');
    io.to(`patient-${req.params.id}`).emit('new-reading', reading);
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;