const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

const seedDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create doctor – plain text password (model will hash it once)
    const doctor = await User.create({
      name: 'Dr. Emily Chen',
      email: 'dr.emily@asthmacare.com',
      password: 'doctor123',
      role: 'doctor',
      specialty: 'Pulmonologist'
    });
    console.log('✅ Created doctor:', doctor.email);

    // Patients data (plain text passwords)
    const patientsData = [
      {
        name: 'Emma Thompson',
        email: 'emma.t@email.com',
        password: 'patient123',
        role: 'patient',
        age: 34,
        phone: '+1 (555) 123-4567',
        doctorId: doctor._id,
        knownTriggers: ['pollen', 'dust', 'exercise'],
        personalBestPef: 450,
        riskLevel: 'high',
        riskScore: 0.75
      },
      {
        name: 'James Wilson',
        email: 'james.w@email.com',
        password: 'patient123',
        role: 'patient',
        age: 45,
        phone: '+1 (555) 234-5678',
        doctorId: doctor._id,
        knownTriggers: ['cold air', 'stress'],
        personalBestPef: 420,
        riskLevel: 'medium',
        riskScore: 0.45
      },
      {
        name: 'Sophia Rodriguez',
        email: 'sophia.r@email.com',
        password: 'patient123',
        role: 'patient',
        age: 28,
        phone: '+1 (555) 345-6789',
        doctorId: doctor._id,
        knownTriggers: ['pollen', 'mold'],
        personalBestPef: 480,
        riskLevel: 'low',
        riskScore: 0.20
      }
    ];

    // Use for...of loop with create() to ensure pre‑save hook runs
    for (const patientData of patientsData) {
      await User.create(patientData);
    }
    console.log(`✅ Created ${patientsData.length} patients`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('📋 Doctor login: dr.emily@asthmacare.com / doctor123');
    console.log('📋 Patient login example: emma.t@email.com / patient123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();