const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['emergency', 'reminder', 'info'],
    required: true
  },
  recipients: [{
    name: String,
    phone: String,
    email: String
  }],
  readingData: {
    type: Object,
    required: false
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'partial'],
    default: 'sent'
  }
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);