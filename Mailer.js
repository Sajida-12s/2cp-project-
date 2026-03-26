const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

async function sendOTP(toEmail, otp) {
  await transporter.sendMail({
    from: `"Your App" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your verification code',
    text: `Your OTP code is: ${otp}\n\nIt expires in 10 minutes.`
  });
}

module.exports = { sendOTP };