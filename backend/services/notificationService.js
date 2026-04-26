const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// SMS configuration (Twilio) - Optionnel, garde-le commenté pour l'instant
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// ✅ VRAIE FONCTION - DÉCOMMENTÉE (celle qui envoie de VRAIS emails)
const sendEmergencyAlert = async (patient, contact, reading) => {
  const subject = `🚨 EMERGENCY ALERT: ${patient.name} - Critical Asthma Risk`;
  
  const message = `
EMERGENCY NOTIFICATION

Patient: ${patient.name}
Risk Level: CRITICAL
Time: ${new Date().toLocaleString()}

Vital Signs:
- PEF Value: ${reading.pef} L/min (Personal Best: ${patient.personalBestPef || 'Not set'})
- Rescue Inhaler Use: ${reading.relief_use} times
- Night Symptoms: ${reading.night_symptoms}
- Day Symptoms: ${reading.day_symptoms}

Action Required:
⚠️ Patient needs immediate medical attention
⚠️ Administer rescue inhaler if available
⚠️ Seek emergency medical care

Contact Patient: ${patient.phone || 'Not provided'}
  `;
  
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #ef4444; border-radius: 10px; padding: 20px;">
      <div style="background-color: #ef4444; color: white; padding: 10px; text-align: center; border-radius: 5px;">
        <h1>🚨 EMERGENCY ALERT</h1>
        <h2>Critical Asthma Risk Detected</h2>
      </div>
      
      <div style="padding: 20px;">
        <h3>Patient: ${patient.name}</h3>
        <p><strong>Risk Level:</strong> <span style="color: #ef4444;">CRITICAL</span></p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        
        <h3>Vital Signs:</h3>
        <ul>
          <li>PEF Value: <strong>${reading.pef} L/min</strong> (Personal Best: ${patient.personalBestPef || 'Not set'})</li>
          <li>Rescue Inhaler Use: <strong>${reading.relief_use} times</strong></li>
          <li>Night Symptoms: <strong>${reading.night_symptoms}</strong></li>
          <li>Day Symptoms: <strong>${reading.day_symptoms}</strong></li>
        </ul>
        
        <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="color: #dc2626;">Action Required:</h3>
          <p>⚠️ Patient needs immediate medical attention</p>
          <p>⚠️ Administer rescue inhaler if available</p>
          <p>⚠️ Seek emergency medical care</p>
        </div>
        
        <p style="margin-top: 20px;"><strong>Contact Patient:</strong> ${patient.phone || 'Not provided'}</p>
      </div>
    </div>
  `;
  
  const results = { email: false, sms: false };
  
  // Send Email if contact has email
  if (contact.email) {
    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contact.email,
        subject: subject,
        text: message,
        html: htmlMessage
      });
      console.log(`✅ Emergency email sent to ${contact.email}`);
      results.email = true;
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
    }
  }
  
  // SMS est commenté pour l'instant (pas de Twilio)
  // if (contact.phone) {
  //   try {
  //     await twilioClient.messages.create({
  //       body: subject + '\n\n' + message.substring(0, 1600),
  //       to: contact.phone,
  //       from: process.env.TWILIO_PHONE_NUMBER
  //     });
  //     console.log(`✅ Emergency SMS sent to ${contact.phone}`);
  //     results.sms = true;
  //   } catch (error) {
  //     console.error('❌ SMS send failed:', error.message);
  //   }
  // }
  
  return results;
};

// ❌ VERSION DE TEST - COMMENTÉE (ne plus utiliser)
// const sendEmergencyAlert = async (patient, contact, reading) => {
//   console.log('🔴 EMERGENCY ALERT TRIGGERED!');
//   console.log(`To: ${contact.name} (${contact.phone}, ${contact.email})`);
//   console.log(`Patient: ${patient.name} - CRITICAL RISK`);
//   console.log('=====================================');
//   return { email: false, sms: false };
// };

// Notify all emergency contacts for a patient
const notifyEmergencyContacts = async (patientId, reading) => {
  try {
    const EmergencyContact = require('../models/emergencyContact');
    const NotificationLog = require('../models/notificationLog');
    const User = require('../models/User');
    
    const patient = await User.findById(patientId);
    if (!patient) {
      console.log('Patient not found:', patientId);
      return false;
    }
    
    const contacts = await EmergencyContact.find({ 
      patientId: patientId,
      notifyOnCritical: true 
    });
    
    if (contacts.length === 0) {
      console.log('No emergency contacts found for patient:', patientId);
      return false;
    }
    
    console.log(`📢 Notifying ${contacts.length} emergency contacts for ${patient.name}`);
    
    const notifications = contacts.map(contact => 
      sendEmergencyAlert(patient, contact, reading)
    );
    
    const results = await Promise.all(notifications);
    
    // Log notification
    await NotificationLog.create({
      patientId: patientId,
      type: 'emergency',
      recipients: contacts.map(c => ({ 
        name: c.name, 
        phone: c.phone, 
        email: c.email 
      })),
      readingData: reading,
      sentAt: new Date()
    });
    
    console.log('✅ Emergency notifications sent successfully');
    return true;
  } catch (error) {
    console.error('Error notifying emergency contacts:', error);
    return false;
  }
};

module.exports = { sendEmergencyAlert, notifyEmergencyContacts };