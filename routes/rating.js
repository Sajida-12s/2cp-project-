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
      'SELECT * FROM evenements WHERE id = ?',
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
    if (booking.appointemet === 'consultation') {
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

    // 6. Save rating using worker_id
    await db.query(
      'INSERT INTO ratings (appointment_id, worker_id, rating) VALUES (?, ?, ?)',
      [appointment_id, booking.worker_id, rating]
    );

    // 7. Update worker average using worker_id (no more name matching)
    await db.query(
      `UPDATE employees 
       SET avg_rating = (
         SELECT AVG(r.rating) 
         FROM ratings r 
         WHERE r.worker_id = ?
       ) 
       WHERE id = ?`,
      [booking.worker_id, booking.worker_id]
    );

    res.json({ success: true });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;