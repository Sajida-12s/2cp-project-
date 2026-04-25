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

    //3 verifying the user own that bla bla 
    const{first_name,family_name }=req.user;
    if (booking.first_name!== first_name || booking.family_name!== family_name){
      return res.status(403).json({error : 'Not authorized to rate this appointment'})
    }
    // 4. Block if consultation
    if (booking.appointemet === 'consultation') {
      return res.status(403).json({ error: 'Consultation cannot be rated' });
    }

    // 5. Check payment was made AND no rating yet
    const [paymentRows] = await db.query(
      'SELECT payement, RateStars, employee_selected FROM paymentandrate WHERE appointemnt_id = ?',
      [appointment_id]
    );

    // No payment yet
    if (!paymentRows[0]) {
      return res.status(403).json({ error: 'Cannot rate before payment is made' });
    }

    // Payment not done yet
    if (paymentRows[0].payement === 0) {
      return res.status(403).json({ error: 'Cannot rate before payment is made' });
    }

    // Already rated
    if ( paymentRows[0].RateStars !==null && paymentRows[0].RateStars !== 0) {
      return res.status(409).json({ error: 'Already rated' });
    }

    // 4. Resolve worker ID from employee table
    const [empRows] = await db.query(
      `SELECT id FROM employee 
       WHERE CONCAT(first_name, ' ', family_name) = ?`,
      [booking.workerSelect]
    );

    if (!empRows[0]) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const workerId = empRows[0].id;

    // 5. Save the rating by updating the existing payment row
    await db.query(
      'UPDATE paymentandrate SET RateStars = ?, employee_selected = ? WHERE appointemnt_id = ?',
      [rating, workerId, appointment_id]
    );

    // 6. Update worker average rating
    await db.query(
      `UPDATE employee 
       SET avg_rating = (
         SELECT AVG(RateStars) 
         FROM paymentandrate 
         WHERE employee_selected = ?
       ) 
       WHERE id = ?`,
      [workerId, workerId]
    );

    res.json({ success: true });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;