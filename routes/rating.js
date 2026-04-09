const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logger } = require('../middleware/Logmiddleware');

// POST /api/ratings
router.post('/', authMiddleware, async (req, res) => {
  const { appointment_id, rating } = req.body;

  if (!appointment_id || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    // 1. Get the appointment
    const [rows] = await db.query(
      'SELECT * FROM evenment WHERE id = ?',
      [appointment_id]
    );

    const booking = rows[0];

    if (!booking) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // 2. Make sure the logged-in user owns this appointment
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your appointment' });
    }

    // 3. Block if consultation
    if (booking.appointment === 'consultation') {
      return res.status(403).json({ error: 'Consultation cannot be rated' });
    }

    // 4. Block if job not done yet
    if (booking.job_done !== 'Oui') {
      return res.status(403).json({ error: 'Job not completed yet' });
    }

    // 5. Block if already rated
    const [existing] = await db.query(
      'SELECT id FROM ratings WHERE appointment_id = ?',
      [appointment_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already rated' });
    }

    // 6. Save rating
    await db.query(
      'INSERT INTO ratings (appointment_id, worker_name, rating) VALUES (?, ?, ?)',
      [appointment_id, booking.workerSelect, rating]
    );

    // 7. Update worker average
    await db.query(
      `UPDATE workers 
       SET avg_rating = (
         SELECT AVG(r.rating) 
         FROM ratings r 
         JOIN evenment e ON r.appointment_id = e.id 
         WHERE e.workerSelect = ?
       ) 
       WHERE name = ?`,
      [booking.workerSelect, booking.workerSelect]
    );

    res.json({ success: true });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;