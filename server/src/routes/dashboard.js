const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — Dashboard data for logged-in user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.org_id;

    // My projects (as lead org)
    const myProjects = orgId ? await db.query(
      `SELECT p.*, ST_X(p.location) as lng, ST_Y(p.location) as lat,
              o.name as lead_org_name
       FROM projects p
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       WHERE p.lead_org_id = $1 OR p.created_by = $2
       ORDER BY p.created_at DESC LIMIT 10`,
      [orgId, userId]
    ) : { rows: [] };

    // Invitations (projects where my org is invited)
    const invitations = orgId ? await db.query(
      `SELECT p.*, pp.status as participation_status, pp.scope,
              ST_X(p.location) as lng, ST_Y(p.location) as lat,
              o.name as lead_org_name
       FROM project_participants pp
       JOIN projects p ON pp.project_id = p.id
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       WHERE pp.org_id = $1 AND pp.status = 'invited'
       ORDER BY p.created_at DESC`,
      [orgId]
    ) : { rows: [] };

    // Compliance score
    const compliance = orgId ? await db.query(
      'SELECT compliance_score FROM organizations WHERE id = $1',
      [orgId]
    ) : { rows: [{ compliance_score: null }] };

    // Upcoming deadlines
    const deadlines = orgId ? await db.query(
      `SELECT p.id, p.title, p.coordination_deadline, p.end_date, p.status
       FROM projects p
       LEFT JOIN project_participants pp ON pp.project_id = p.id
       WHERE (p.lead_org_id = $1 OR pp.org_id = $1)
         AND p.status IN ('posted', 'coordination', 'approved', 'in_progress')
         AND (p.coordination_deadline > NOW() OR p.end_date > NOW())
       ORDER BY COALESCE(p.coordination_deadline, p.end_date) ASC
       LIMIT 5`,
      [orgId]
    ) : { rows: [] };

    // Recent notifications
    const notifications = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    // Unread notification count
    const unreadCount = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );

    res.json({
      myProjects: myProjects.rows,
      invitations: invitations.rows,
      complianceScore: compliance.rows[0]?.compliance_score,
      upcomingDeadlines: deadlines.rows,
      notifications: notifications.rows,
      unreadNotifications: parseInt(unreadCount.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
