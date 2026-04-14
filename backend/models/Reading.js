const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  night_symptoms: { type: Number, min: 0, max: 7, required: true },   // 0-7 nights per week
  day_symptoms: { type: Number, min: 0, max: 7, required: true },     // 0-7 days per week
  pef_norm: { type: Number, min: 0, max: 1, required: true },         // normalized to personal best
  relief_use: { type: Number, min: 0, required: true },               // times per week
  steps: Number,
  mean_hr: Number,
  sleep_minutes: Number,
  temperature: Number,
  aqi: Number,
  riskScore: Number,
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Reading', readingSchema);