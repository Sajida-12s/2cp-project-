// routes/comments.routes.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { getIO } = require('../socket');
const authMiddleware = require('../middleware/auth');
const { logger } = require("../middleware/Logmiddleware");

// POST /api/comments — user posts a comment on an employee profile
router.post('/', authMiddleware, async (req, res) => {
  const { employee_id, content } = req.body;
  const user_id = req.user.id;

  if (!employee_id || !content) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    // 1. Save the comment
    const [result] = await db.query(
      'INSERT INTO comments (employee_id, user_id, content) VALUES (?, ?, ?)',
      [employee_id, user_id, content]
    );
    const commentId = result.insertId;

    // 2. Get commenter's name
    const [userRows] = await db.query(
      'SELECT first_name, family_name FROM person WHERE id = ?',
      [user_id]
    );

    const user = userRows[0];
    const userName = user
      ? `${user.first_name} ${user.family_name}`
      : 'Someone';

    // 3. Save notification to DB
    const message = `${userName} left you a comment: "${content.slice(0, 60)}..."`;

    const [notifResult] = await db.query(
      'INSERT INTO notifications (recipient_id, type, message, reference_id) VALUES (?, ?, ?, ?)',
      [employee_id, 'new_comment', message, commentId]
    );

    const notification = {
      id: notifResult.insertId,
      recipient_id: employee_id,
      type: 'new_comment',
      message,
      reference_id: commentId,
      is_read: 0
    };

    // 4. Push real-time notification via Socket.io
    getIO()
      .to(`employee_${employee_id}`)
      .emit('new_notification', notification);

    res.status(201).json({ success: true, comment: { id: commentId, content } });

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// GET /api/comments/:employeeId — get all comments for an employee
router.get('/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT c.*, p.first_name, p.family_name
       FROM comments c
       JOIN person p ON p.id = c.user_id
       WHERE c.employee_id = ?
       ORDER BY c.created_at DESC`,
      [employeeId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

module.exports = router;