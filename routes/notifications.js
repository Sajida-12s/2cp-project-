// routes/notifications.routes.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/notifications — employee fetches their unread notifications
router.get('/', authMiddleware, async (req, res) => {
  const employeeId = req.user.id;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  const { id } = req.params;
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2`,
    [id, req.user.id]
  );
  res.json({ success: true });
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', authMiddleware, async (req, res) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1`,
    [req.user.id]
  );
  res.json({ success: true });
});


module.exports = router;