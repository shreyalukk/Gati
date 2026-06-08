const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — Get user notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;
    const where = unreadOnly === 'true' ? 'AND n.read = false' : '';

    const result = await db.query(
      `SELECT n.*, p.title as project_title
       FROM notifications n
       LEFT JOIN projects p ON n.project_id = p.id
       WHERE n.user_id = $1 ${where}
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — Mark as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all — Mark all as read
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
