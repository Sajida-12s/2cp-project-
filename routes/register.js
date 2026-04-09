const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendOTP } = require('../Mailer');
const { logger } = require('../middleware/Logmiddleware');

// -----POST /register----
router.post('/register', async (req, res) => {
  const { name, familyname, email, password, adress, job, phone } = req.body;

  // validation
  if (!name || !familyname || !email || !password || !adress || !job || !phone) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if email or phone already exists they should be unique
    const [existing] = await db.query(
      'SELECT id FROM employees WHERE email = ? OR phone = ?', [email, phone]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generating OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Delete any previous OTP for the email
    await db.query('DELETE FROM otp_temp WHERE email = ?', [email]);

    // Save everything in temp otp table
    await db.query(
      `INSERT INTO otp_temp 
       (name, familyname, email, password, adress, job, phone, otp, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, familyname, email, hashedPassword, adress, job, phone, otp, expiresAt]
    );

    // Send OTP to email
    await sendOTP(email, otp);

    res.status(200).json({ message: 'OTP sent to your email. Please verify.' });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- POST /verify-otp ---
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    // Find the temp record
    const [rows] = await db.query(
      'SELECT * FROM otp_temp WHERE email = ?', [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No OTP found for this email' });
    }

    const temp = rows[0];

    // Check expiry
    if (new Date() > new Date(temp.expires_at)) {
      await db.query('DELETE FROM otp_temp WHERE email = ?', [email]);
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    // Check OTP
    if (otp !== temp.otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Save employee to the real table
    const [result] = await db.query(
      `INSERT INTO employees 
       (name, familyname, email, password, adress, job, phone, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [temp.name, temp.familyname, temp.email, temp.password, temp.adress, temp.job, temp.phone]
    );

    // Clean up otp_temp
    await db.query('DELETE FROM otp_temp WHERE email = ?', [email]);

    // Auto-login: generate token for the newly created employee
    const token = jwt.sign(
      { id: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Email verified! Employee account activated.',
      token,
      employee: {
        id: result.insertId,
        name: temp.name,
        phone: temp.phone,
      }
    });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;