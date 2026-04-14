const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/asthma_db');

const User = mongoose.model('User', new mongoose.Schema({
    email: String,
    password: String
}));

async function resetPassword() {
    const email = 'emma.t@email.com';
    const newPassword = 'test123';
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await User.updateOne(
        { email: email },
        { $set: { password: hashedPassword } }
    );
    
    console.log(`Password reset for ${email}: ${result.modifiedCount} document(s) modified`);
    console.log(`New password: ${newPassword}`);
    
    mongoose.disconnect();
}

resetPassword();