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

  // Create transporter fresh each time to pick up current env vars
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const info = await transporter.sendMail({
      from: `"Leetcode Clone" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: title,
      html: body,
    });

    console.log('📧 Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    throw error;
  }
};

module.exports = mailSender;

