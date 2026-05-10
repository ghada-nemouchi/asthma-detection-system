const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      console.log('✅ User authenticated:', req.user.role);
      return next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const doctorOnly = (req, res, next) => {
  console.log('👨‍⚕️ doctorOnly middleware, user role:', req.user?.role);
  
  if (req.user && req.user.role === 'doctor') {
    console.log('✅ User is a doctor, proceeding');
    return next();
  } else {
    console.log('❌ Access denied - user is not a doctor');
    return res.status(403).json({ message: 'Access denied. Doctor only.' });
  }
};

module.exports = { protect, doctorOnly };