const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  patientId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  night_symptoms:{ type: Number, min: 0, max: 7, required: true },  // nights/week
  day_symptoms:  { type: Number, min: 0, max: 7, required: true },  // days/week
  pef_norm:      { type: Number, min: 0, required: true },  // fraction of personal best
  pef_actual: { type: Number, required: true },
  relief_use:    { type: Number, min: 0, required: true },           // times/week
  steps:         { type: Number, default: 0 },
  mean_hr:       { type: Number, default: 0 },
  sleep_minutes: { type: Number, default: 0 },
  temperature:   { type: Number, default: 0 },
  aqi:           { type: Number, default: 0 },
  riskScore:     { type: Number, default: 0 },
  riskLevel:     { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  timestamp:     { type: Date, default: Date.now },
  hasCold: { type: Boolean, default: false },
});

module.exports = mongoose.model('Reading', readingSchema);