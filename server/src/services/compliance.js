const db = require('../config/db');

/**
 * Compliance Score Calculator
 */
const compliance = {
  /**
   * Recalculate and update an organization's compliance score
   */
  async recalculate(orgId) {
    try {
      const result = await db.query(
        'SELECT recalculate_compliance_score($1) as score',
        [orgId]
      );
      return result.rows[0].score;
    } catch (err) {
      console.error('Compliance score calculation failed:', err.message);
      return null;
    }
  },

  /**
   * Get compliance breakdown for an organization
   */
  async getBreakdown(orgId) {
    // Projects posted before start date
    const postedBefore = await db.query(
      `SELECT COUNT(*) as count FROM projects
       WHERE lead_org_id = $1 AND created_at::date <= start_date`,
      [orgId]
    );

    const totalProjects = await db.query(
      'SELECT COUNT(*) as count FROM projects WHERE lead_org_id = $1',
      [orgId]
    );

    // Coordination responses
    const responded = await db.query(
      `SELECT COUNT(*) as count FROM project_participants
       WHERE org_id = $1 AND status IN ('joined', 'opted_out', 'signed_off')`,
      [orgId]
    );

    const totalInvites = await db.query(
      'SELECT COUNT(*) as count FROM project_participants WHERE org_id = $1',
      [orgId]
    );

    // On-time completion
    const onTime = await db.query(
      `SELECT COUNT(*) as count FROM projects
       WHERE lead_org_id = $1 AND status = 'completed'
       AND completed_at::date <= end_date`,
      [orgId]
    );

    const totalCompleted = await db.query(
      `SELECT COUNT(*) as count FROM projects
       WHERE lead_org_id = $1 AND status = 'completed'`,
      [orgId]
    );

    // Violations
    const violations = await db.query(
      `SELECT COUNT(*) as count FROM violations v
       JOIN projects p ON v.project_id = p.id
       WHERE p.lead_org_id = $1 AND v.status = 'confirmed'`,
      [orgId]
    );

    // Current score
    const org = await db.query(
      'SELECT compliance_score FROM organizations WHERE id = $1',
      [orgId]
    );

    return {
      currentScore: org.rows[0]?.compliance_score || 0,
      breakdown: {
        postedBeforeStart: {
          score: 20,
          achieved: parseInt(postedBefore.rows[0].count),
          total: parseInt(totalProjects.rows[0].count)
        },
        coordinationResponse: {
          score: 20,
          achieved: parseInt(responded.rows[0].count),
          total: parseInt(totalInvites.rows[0].count)
        },
        onTimeCompletion: {
          score: 20,
          achieved: parseInt(onTime.rows[0].count),
          total: parseInt(totalCompleted.rows[0].count)
        },
        violations: {
          penalty: -30,
          count: parseInt(violations.rows[0].count)
        }
      }
    };
  }
};

module.exports = compliance;
