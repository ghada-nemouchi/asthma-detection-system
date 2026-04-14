const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reading', required: true },
  riskLevel: { type: String, enum: ['high', 'critical'], required: true },
  riskScore: { type: Number, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Alert', alertSchema);