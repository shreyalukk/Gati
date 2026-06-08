const express = require('express');
const db = require('../config/db');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const geoConflict = require('../services/geoConflict');
const notificationService = require('../services/notifications');
const complianceService = require('../services/compliance');

const router = express.Router();

// GET /api/projects — List projects with filters
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { city, status, workType, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];
    let paramIdx = 1;

    if (city) { where.push(`p.city = $${paramIdx++}`); params.push(city); }
    if (status) { where.push(`p.status = $${paramIdx++}`); params.push(status); }
    if (workType) { where.push(`p.work_type = $${paramIdx++}`); params.push(workType); }
    if (search) {
      where.push(`(p.title ILIKE $${paramIdx} OR p.address ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM projects p ${whereClause}`,
      params
    );

    const result = await db.query(
      `SELECT p.*, o.name as lead_org_name, o.type as lead_org_type,
              ST_X(p.location) as lng, ST_Y(p.location) as lat,
              (SELECT COUNT(*) FROM project_participants pp WHERE pp.project_id = p.id) as participant_count,
              (SELECT COUNT(*) FROM updates u WHERE u.project_id = p.id) as update_count
       FROM projects p
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      projects: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/stats — Public stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('posted', 'coordination', 'approved', 'in_progress')) as active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
        COUNT(DISTINCT city) as cities_covered,
        COUNT(*) as total_projects
      FROM projects
    `);

    const orgCount = await db.query('SELECT COUNT(*) FROM organizations WHERE verified = true');

    res.json({
      activeProjects: parseInt(stats.rows[0].active_projects),
      completedProjects: parseInt(stats.rows[0].completed_projects),
      citiesCovered: parseInt(stats.rows[0].cities_covered),
      totalProjects: parseInt(stats.rows[0].total_projects),
      registeredOrgs: parseInt(orgCount.rows[0].count),
      moneySaved: parseInt(stats.rows[0].completed_projects) * 2500000 // ₹25L estimated per coordinated project
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — Project detail
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, o.name as lead_org_name, o.type as lead_org_type, o.compliance_score as lead_org_score,
              ST_X(p.location) as lng, ST_Y(p.location) as lat,
              u.full_name as created_by_name
       FROM projects p
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const project = result.rows[0];

    // Get participants
    const participants = await db.query(
      `SELECT pp.*, o.name as org_name, o.type as org_type, o.compliance_score
       FROM project_participants pp
       JOIN organizations o ON pp.org_id = o.id
       WHERE pp.project_id = $1
       ORDER BY pp.created_at`,
      [req.params.id]
    );

    // Get updates
    const updates = await db.query(
      `SELECT up.*, u.full_name as user_name, o.name as org_name
       FROM updates up
       LEFT JOIN users u ON up.user_id = u.id
       LEFT JOIN organizations o ON up.org_id = o.id
       WHERE up.project_id = $1
       ORDER BY up.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    // Get violations
    const violations = await db.query(
      `SELECT v.*, u.full_name as reporter_name_user
       FROM violations v
       LEFT JOIN users u ON v.reported_by = u.id
       WHERE v.project_id = $1
       ORDER BY v.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...project,
      participants: participants.rows,
      updates: updates.rows,
      violations: violations.rows
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — Create a new project
router.post('/', authenticate, authorize('government', 'contractor', 'admin'), async (req, res, next) => {
  try {
    const { title, description, workType, lng, lat, address, city, pincode, startDate, endDate, orgId } = req.body;

    if (!title || !workType || !lng || !lat) {
      return res.status(400).json({ error: 'Title, work type, and location are required.' });
    }

    const leadOrgId = orgId || req.user.org_id;
    const coordinationDeadline = new Date();
    coordinationDeadline.setDate(coordinationDeadline.getDate() + 14);

    const result = await db.query(
      `INSERT INTO projects (title, description, work_type, status, location, address, city, pincode,
         start_date, end_date, lead_org_id, created_by, coordination_deadline)
       VALUES ($1, $2, $3, 'posted', ST_SetSRID(ST_MakePoint($4, $5), 4326),
         $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *, ST_X(location) as lng, ST_Y(location) as lat`,
      [title, description, workType, lng, lat, address, city, pincode,
       startDate, endDate, leadOrgId, req.user.id, coordinationDeadline]
    );

    const project = result.rows[0];

    // Run geo-conflict analysis
    const analysis = await geoConflict.analyzeProject(lng, lat);

    // Auto-invite affected organizations
    if (analysis.hasConflicts) {
      await geoConflict.autoInviteOrgs(project.id, analysis.affectedOrgs);
      await notificationService.notifyConflict(project.id, title, analysis.affectedOrgs);
    }

    res.status(201).json({
      project,
      conflictAnalysis: analysis
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:id/status — Update project status
router.patch('/:id/status', authenticate, authorize('government', 'contractor', 'admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['posted', 'coordination', 'approved', 'in_progress', 'completed', 'violation'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const updates = { status };
    if (status === 'approved') updates.approved_at = new Date();
    if (status === 'completed') updates.completed_at = new Date();

    const result = await db.query(
      `UPDATE projects SET status = $1, approved_at = COALESCE($2, approved_at),
       completed_at = COALESCE($3, completed_at), updated_at = NOW()
       WHERE id = $4 RETURNING *, ST_X(location) as lng, ST_Y(location) as lat`,
      [status, updates.approved_at || null, updates.completed_at || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // If completed, generate road warranty
    if (status === 'completed') {
      const project = result.rows[0];
      await db.query(
        `INSERT INTO road_warranties (project_id, geometry, warranty_start, warranty_end, city)
         VALUES ($1,
           ST_Buffer(ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, 50)::geometry,
           CURRENT_DATE, CURRENT_DATE + INTERVAL '5 years', $4)`,
        [project.id, project.lng, project.lat, project.city]
      );

      // Recalculate compliance for lead org
      if (project.lead_org_id) {
        await complianceService.recalculate(project.lead_org_id);
      }

      // Add status update
      await db.query(
        `INSERT INTO updates (project_id, org_id, user_id, type, content)
         VALUES ($1, $2, $3, 'status_change', 'Project completed. Road warranty certificate issued for 5 years.')`,
        [project.id, req.user.org_id, req.user.id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/join — Join project as participant
router.post('/:id/join', authenticate, authorize('government', 'contractor'), async (req, res, next) => {
  try {
    const { scope } = req.body;
    const orgId = req.user.org_id;

    if (!orgId) {
      return res.status(400).json({ error: 'You must be associated with an organization to join.' });
    }

    const result = await db.query(
      `INSERT INTO project_participants (project_id, org_id, scope, status, joined_at)
       VALUES ($1, $2, $3, 'joined', NOW())
       ON CONFLICT (project_id, org_id)
       DO UPDATE SET scope = $3, status = 'joined', joined_at = NOW()
       RETURNING *`,
      [req.params.id, orgId, scope || 'To be defined']
    );

    // Recalculate compliance
    await complianceService.recalculate(orgId);

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/opt-out — Opt out (triggers 3-year no-dig restriction)
router.post('/:id/opt-out', authenticate, authorize('government', 'contractor'), async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    if (!orgId) {
      return res.status(400).json({ error: 'You must be associated with an organization.' });
    }

    const noDigUntil = new Date();
    noDigUntil.setFullYear(noDigUntil.getFullYear() + 3);

    const result = await db.query(
      `INSERT INTO project_participants (project_id, org_id, status, no_dig_until)
       VALUES ($1, $2, 'opted_out', $3)
       ON CONFLICT (project_id, org_id)
       DO UPDATE SET status = 'opted_out', no_dig_until = $3
       RETURNING *`,
      [req.params.id, orgId, noDigUntil]
    );

    await complianceService.recalculate(orgId);

    res.json({
      ...result.rows[0],
      warning: `3-year no-dig restriction applied until ${noDigUntil.toISOString().split('T')[0]}`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/sign-off — Digital sign-off
router.post('/:id/sign-off', authenticate, authorize('government', 'contractor'), async (req, res, next) => {
  try {
    const orgId = req.user.org_id;

    const result = await db.query(
      `UPDATE project_participants SET status = 'signed_off', signed_off_at = NOW()
       WHERE project_id = $1 AND org_id = $2
       RETURNING *`,
      [req.params.id, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participation record not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/updates — Post update
router.post('/:id/updates', authenticate, async (req, res, next) => {
  try {
    const { type, content, mediaUrl } = req.body;

    const result = await db.query(
      `INSERT INTO updates (project_id, org_id, user_id, type, content, media_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, req.user.org_id, req.user.id, type || 'comment', content, mediaUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
