const express = require('express');
const router = express.Router();
const EmergencyContact = require('../models/emergencyContact');
const { protect } = require('../middleware/auth');

// Get all emergency contacts for logged-in patient
router.get('/emergency-contacts', protect, async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ patientId: req.user.id });
    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add emergency contact
router.post('/emergency-contacts', protect, async (req, res) => {
  try {
    const { name, relationship, phone, email, isPrimary, notifyOnCritical } = req.body;
    
    // If this is primary, unset other primary contacts
    if (isPrimary) {
      await EmergencyContact.updateMany(
        { patientId: req.user.id },
        { isPrimary: false }
      );
    }
    
    const contact = new EmergencyContact({
      patientId: req.user.id,
      name,
      relationship,
      phone,
      email,
      isPrimary: isPrimary || false,
      notifyOnCritical: notifyOnCritical !== false
    });
    
    await contact.save();
    res.status(201).json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update emergency contact
router.put('/emergency-contacts/:id', protect, async (req, res) => {
  try {
    const { name, relationship, phone, email, isPrimary, notifyOnCritical } = req.body;
    
    // If this is primary, unset other primary contacts
    if (isPrimary) {
      await EmergencyContact.updateMany(
        { patientId: req.user.id, _id: { $ne: req.params.id } },
        { isPrimary: false }
      );
    }
    
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, patientId: req.user.id },
      { name, relationship, phone, email, isPrimary, notifyOnCritical },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete emergency contact
router.delete('/emergency-contacts/:id', protect, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.id,
      patientId: req.user.id
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;