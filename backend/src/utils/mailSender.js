const nodemailer = require('nodemailer');
const path = require('path');

// Load .env from the backend root (two levels up from src/utils/)
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const mailSender = async (email, title, body) => {
  // Debug: log what we see
  console.log('🔧 EMAIL_USER =', process.env.EMAIL_USER || '❌ NOT SET');
  console.log('🔧 EMAIL_PASS =', process.env.EMAIL_PASS ? '✅ SET (' + process.env.EMAIL_PASS.length + ' chars)' : '❌ NOT SET');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials missing. Set EMAIL_USER and EMAIL_PASS in backend/.env');
  }

  const cleanUser = process.env.EMAIL_USER.trim();
  const cleanPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: cleanUser,
      pass: cleanPass,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
  });

  try {
    const info = await transporter.sendMail({
      from: `"Code Arena" <${cleanUser}>`,
      to: email,
      subject: title,
      html: body,
    });

    console.log('📧 Gmail Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Gmail SMTP error:', error.message);
    
    // Fallback: Create Ethereal test inbox so email sending never fails completely
    try {
      console.log('🔄 Attempting fallback delivery via Ethereal Test Mail...');
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000
      });

      const testInfo = await testTransporter.sendMail({
        from: '"Code Arena" <no-reply@codearena.com>',
        to: email,
        subject: title,
        html: body,
      });

      const previewUrl = nodemailer.getTestMessageUrl(testInfo);
      console.log('✅ Email sent via Ethereal Test Mail!');
      console.log('🔗 View email in browser:', previewUrl);
      return testInfo;
    } catch (etherealErr) {
      console.error('❌ Ethereal fallback error:', etherealErr.message);
      throw error;
    }
  }
};

module.exports = mailSender;

