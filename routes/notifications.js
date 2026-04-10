// routes/notifications.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/notifications
router.get('/', authMiddleware, async (req, res) => {
  const employeeId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT * FROM notifications
       WHERE recipient_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ⚠️ read-all MUST come before /:id/read
router.patch('/read-all', authMiddleware, async (req, res) => {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE recipient_id = ?',
    [req.user.id]
  );
  res.json({ success: true });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  const { id } = req.params;
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?',
    [id, req.user.id]
  );
  res.json({ success: true });
});

module.exports = router;