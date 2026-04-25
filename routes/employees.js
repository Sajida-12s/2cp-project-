const express = require('express');
const router = express.Router();
const db = require('../db');
const { logger } = require('../middleware/Logmiddleware');

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
     `SELECT first_name, family_name, Job, Adrres, avg_rating 
       FROM employee 
       ORDER BY avg_rating DESC`          
    );
    res.json(rows);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;