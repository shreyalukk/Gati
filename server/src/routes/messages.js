const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:projectId — Get messages for a coordination room
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await db.query(
      `SELECT m.*, u.full_name as user_name, u.role as user_role,
              o.name as org_name
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE m.project_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.projectId, parseInt(limit), offset]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/:projectId — Send a message
router.post('/:projectId', authenticate, async (req, res, next) => {
  try {
    const { content, fileUrl, fileName } = req.body;

    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Message content or file is required.' });
    }

    const result = await db.query(
      `INSERT INTO messages (project_id, user_id, content, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.projectId, req.user.id, content, fileUrl, fileName]
    );

    // Return with user info
    const message = await db.query(
      `SELECT m.*, u.full_name as user_name, u.role as user_role,
              o.name as org_name
       FROM messages m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE m.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(message.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/:projectId/checklist — Task checklist for coordination room
router.get('/:projectId/checklist', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT pp.*, o.name as org_name, o.type as org_type
       FROM project_participants pp
       JOIN organizations o ON pp.org_id = o.id
       WHERE pp.project_id = $1
       ORDER BY pp.created_at`,
      [req.params.projectId]
    );

    const project = await db.query(
      'SELECT coordination_deadline, status FROM projects WHERE id = $1',
      [req.params.projectId]
    );

    res.json({
      participants: result.rows,
      coordinationDeadline: project.rows[0]?.coordination_deadline,
      projectStatus: project.rows[0]?.status
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
