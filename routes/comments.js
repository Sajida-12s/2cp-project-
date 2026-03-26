// routes/comments.routes.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');          // your pg Pool instance
const { getIO } = require('../socket');
const authMiddleware = require('../middleware/auth'); // your existing JWT middleware
const { logger } = require("../middleware/Logmiddleware");

// POST /api/comments — user posts a comment on an employee profile
router.post('/', authMiddleware, async (req, res) => {
  const { employee_id, content } = req.body;
  const user_id = req.user.id; // from JWT

  try {
    // 1. Save the comment
    const { rows } = await pool.query(
      `INSERT INTO comments (employee_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [employee_id, user_id, content]
    );
    const comment = rows[0];

    // 2. Get commenter's name for the notification message
    const userResult = await pool.query(
      `SELECT name FROM users WHERE id = $1`, [user_id]
    );
    const userName = userResult.rows[0]?.name || 'Someone';

    // 3. Save notification to DB
    const message = `${userName} left you a comment: "${content.slice(0, 60)}..."`;
    const notif = await pool.query(
      `INSERT INTO notifications (recipient_id, type, message, reference_id)
       VALUES ($1, 'new_comment', $2, $3) RETURNING *`,
      [employee_id, message, comment.id]
    );

    // 4. Push real-time notification via Socket.io
    getIO()
      .to(`employee_${employee_id}`)
      .emit('new_notification', notif.rows[0]);

    res.status(201).json({ success: true, comment });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// GET /api/comments/:employeeId — get all comments on an employee profile
router.get('/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.employee_id = $1
       ORDER BY c.created_at DESC`,
      [employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

module.exports = router;