const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['doctor', 'patient', 'admin'], default: 'patient' },
  
  // Common fields
  phone: String,
  createdAt: { type: Date, default: Date.now },
  
  // Doctor-specific
  specialty: { type: String, default: 'Pulmonologist' },
  
  // Patient-specific fields
  age: Number,
  asthmaSeverity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'mild' },
  address: {type: String,   default: ''},
  baselineHr: { type: Number, default: 70 },
  baselineSteps: { type: Number, default: 5000 },
  readingCount: { type: Number, default: 0 },
  knownTriggers: [String],
  personalBestPef: { type: Number, default: 450 }, 
  fcmToken: String,
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  riskScore: { type: Number, default: 0 },
  lastReading: Date,
  
  // Doctor-patient relationship (ONLY ONCE!)
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  doctorRequested: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  doctorRequestStatus: { type: String, enum: ['pending', 'accepted', 'rejected', 'none'], default: 'none' },
  doctorRequestDate: { type: Date, default: null },

  // ✅ NEW FIELDS - Place them HERE (inside the schema, NOT in pre-save)
  personalBestStatus: { 
    type: String, 
    enum: ['not_started', 'measuring', 'calculated', 'expired'],
    default: 'not_started' 
  },
  personalBestStartDate: { type: Date, default: null },
  personalBestReadings: [{ 
    value: Number, 
    date: Date 
  }],
  personalBestLastCalculated: { type: Date, default: null }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();  // ← ONLY next() here, no schema fields!
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);