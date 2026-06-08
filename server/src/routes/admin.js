const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const complianceService = require('../services/compliance');

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/overview — Admin overview stats
router.get('/overview', async (req, res, next) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'posted') as pending_approval,
        (SELECT COUNT(*) FROM organizations) as total_organizations,
        (SELECT COUNT(*) FROM violations WHERE status = 'pending') as pending_violations,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM projects WHERE status IN ('posted', 'coordination', 'approved', 'in_progress')) as active_projects
    `);

    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/projects — All projects for admin management
router.get('/projects', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? 'WHERE p.status = $1' : '';
    const params = status ? [status] : [];

    const result = await db.query(
      `SELECT p.*, o.name as lead_org_name, ST_X(p.location) as lng, ST_Y(p.location) as lat,
              u.full_name as created_by_name
       FROM projects p
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       LEFT JOIN users u ON p.created_by = u.id
       ${where}
       ORDER BY p.created_at DESC`,
      params
    );

    res.json({ projects: result.rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/projects/:id/approve — Approve a project
router.patch('/projects/:id/approve', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE projects SET status = 'coordination', approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/projects/:id/reject — Reject a project
router.patch('/projects/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await db.query(
      `UPDATE projects SET status = 'violation', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Add update with rejection reason
    await db.query(
      `INSERT INTO updates (project_id, user_id, type, content)
       VALUES ($1, $2, 'status_change', $3)`,
      [req.params.id, req.user.id, `Project rejected: ${reason || 'No reason provided'}`]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/organizations — All organizations with compliance
router.get('/organizations', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM projects WHERE lead_org_id = o.id) as project_count,
              (SELECT COUNT(*) FROM users WHERE org_id = o.id) as user_count
       FROM organizations o
       ORDER BY o.compliance_score DESC`
    );

    res.json({ organizations: result.rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/organizations/:id/verify — Verify an organization
router.patch('/organizations/:id/verify', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE organizations SET verified = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/compliance — Compliance scores across all orgs
router.get('/compliance', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.id, o.name, o.type, o.compliance_score, o.verified,
              (SELECT COUNT(*) FROM violations v
               JOIN projects p ON v.project_id = p.id
               WHERE p.lead_org_id = o.id AND v.status = 'confirmed') as violation_count
       FROM organizations o
       ORDER BY o.compliance_score DESC`
    );

    res.json({ organizations: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/export — Export report data
router.get('/export', async (req, res, next) => {
  try {
    const projects = await db.query(
      `SELECT p.title, p.work_type, p.status, p.city, p.start_date, p.end_date,
              o.name as organization, p.created_at
       FROM projects p
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       ORDER BY p.created_at DESC`
    );

    res.json({
      exportDate: new Date().toISOString(),
      projects: projects.rows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
