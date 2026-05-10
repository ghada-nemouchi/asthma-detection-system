const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register user (doctor or patient)
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, specialty, age, doctorId, personalBestPef , baselineHr,baselineSteps,  phone            

    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Determine role – only 'doctor' or 'patient' allowed
    const userRole = (role === 'doctor') ? 'doctor' : 'patient';

    // Base user data
    const userData = {
      name,
      email,
      password,
      role: userRole,
    };

    // Add role-specific fields
    if (userRole === 'doctor') {
      userData.specialty = specialty || 'Pulmonologist';
    } else {
      // Patient-specific fields
      userData.age = age;
      userData.doctorId = doctorId;
      userData.personalBestPef = personalBestPef || 400;
      userData.baselineHr = baselineHr || 70;        
      userData.baselineSteps = baselineSteps || 5000; 
    }

    const user = await User.create(userData);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      specialty: user.specialty,
      age: user.age,
      phone: user.phone,
      personalBestPef: user.personalBestPef,
      baselineHr: user.baselineHr,
      baselineSteps: user.baselineSteps,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialty: user.specialty,
        age: user.age,
        phone: user.phone,
        personalBestPef: user.personalBestPef,
        baselineHr: user.baselineHr,
        baselineSteps: user.baselineSteps,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, getMe };