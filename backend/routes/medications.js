const express = require('express');
const router = express.Router();
const Medication = require('../models/Medication');
const { protect } = require('../middleware/auth');

// GET all medications for logged-in patient
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Patient only' });
    }
    const medications = await Medication.find({ patientId: req.user.id, isActive: true });
    res.json(medications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST add new medication
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Patient only' });
    }
    const medication = new Medication({
      patientId: req.user.id,
      ...req.body
    });
    await medication.save();
    res.status(201).json(medication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update medication
router.put('/:id', protect, async (req, res) => {
  try {
    const medication = await Medication.findOne({
      _id: req.params.id,
      patientId: req.user.id
    });
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    Object.assign(medication, req.body);
    await medication.save();
    res.json(medication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE medication (soft delete)
router.delete('/:id', protect, async (req, res) => {
  try {
    const medication = await Medication.findOne({
      _id: req.params.id,
      patientId: req.user.id
    });
    if (!medication) {
      return res.status(404).json({ message: 'Medication not found' });
    }
    medication.isActive = false;
    await medication.save();
    res.json({ message: 'Medication removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;