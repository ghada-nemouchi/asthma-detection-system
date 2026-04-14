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
  
  // Patient-specific (only used if role === 'patient')
  age: Number,
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  knownTriggers: [String],
  personalBestPef: { type: Number, default: 400 },
  fcmToken: String,
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  riskScore: { type: Number, default: 0 },
  lastReading: Date,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);