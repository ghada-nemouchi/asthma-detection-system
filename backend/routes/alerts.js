const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { protect, doctorOnly } = require('../middleware/auth');

// GET recent alerts for doctor dashboard
router.get('/recent', protect, doctorOnly, async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('patientId', 'name email');
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id/read – mark alert as read (doctor only)
router.patch('/:id/read', protect, doctorOnly, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;