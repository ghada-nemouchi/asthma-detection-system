const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  relationship: {
    type: String,
    required: true,
    enum: ['parent', 'spouse', 'sibling', 'friend', 'other']
  },
  phone: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']   
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  notifyOnCritical: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);