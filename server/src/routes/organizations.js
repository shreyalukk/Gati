const express = require('express');
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/organizations — List all organizations
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.id, o.name, o.type, o.city, o.compliance_score, o.verified,
              (SELECT COUNT(*) FROM projects WHERE lead_org_id = o.id) as project_count
       FROM organizations o
       WHERE o.verified = true
       ORDER BY o.name`
    );

    res.json({ organizations: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/organizations/:id — Organization detail
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM projects WHERE lead_org_id = o.id) as project_count,
              (SELECT COUNT(*) FROM users WHERE org_id = o.id) as member_count
       FROM organizations o WHERE o.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
