const express = require('express');
const db = require('../config/db');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const notificationService = require('../services/notifications');

const router = express.Router();

// GET /api/violations — List violations
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { city, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];
    let idx = 1;

    if (city) { where.push(`v.city = $${idx++}`); params.push(city); }
    if (status) { where.push(`v.status = $${idx++}`); params.push(status); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const result = await db.query(
      `SELECT v.*, p.title as project_title, u.full_name as reporter_full_name,
              ST_X(v.location) as lng, ST_Y(v.location) as lat
       FROM violations v
       LEFT JOIN projects p ON v.project_id = p.id
       LEFT JOIN users u ON v.reported_by = u.id
       ${whereClause}
       ORDER BY v.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ violations: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/violations — Report a violation (citizens can do this without login)
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { projectId, description, address, city, lng, lat, reporterName, reporterPhone } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    const result = await db.query(
      `INSERT INTO violations (project_id, reported_by, reporter_name, reporter_phone, description,
         location, address, city)
       VALUES ($1, $2, $3, $4, $5, ${lng && lat ? `ST_SetSRID(ST_MakePoint($6, $7), 4326)` : 'NULL'}, $8, $9)
       RETURNING *, ST_X(location) as lng, ST_Y(location) as lat`,
      [
        projectId || null,
        req.user?.id || null,
        reporterName || req.user?.full_name || 'Anonymous',
        reporterPhone || req.user?.phone || null,
        description,
        ...(lng && lat ? [lng, lat] : []),
        address || null,
        city || null
      ]
    );

    // Notify admins
    if (projectId) {
      const project = await db.query('SELECT title FROM projects WHERE id = $1', [projectId]);
      if (project.rows.length > 0) {
        await notificationService.notifyViolation(projectId, project.rows[0].title, description);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/violations/:id — Update violation status (admin only)
router.patch('/:id', authenticate, authorize('admin', 'government'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'investigating', 'confirmed', 'resolved', 'dismissed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const result = await db.query(
      `UPDATE violations SET status = $1, resolved_at = ${status === 'resolved' ? 'NOW()' : 'resolved_at'}
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
