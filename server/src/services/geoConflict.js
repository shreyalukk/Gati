const db = require('../config/db');

/**
 * Geo-Conflict Engine
 * Detects utility assets that conflict with a project location
 */
const geoConflict = {
  /**
   * Find conflicting utility assets within a radius of a point
   */
  async findConflicts(lng, lat, radiusMeters = 500) {
    const result = await db.query(
      `SELECT * FROM find_conflicting_assets($1, $2, $3)`,
      [lng, lat, radiusMeters]
    );
    return result.rows;
  },

  /**
   * Check for active road warranties near a point
   */
  async checkWarranties(lng, lat, radiusMeters = 100) {
    const result = await db.query(
      `SELECT * FROM check_road_warranty($1, $2, $3)`,
      [lng, lat, radiusMeters]
    );
    return result.rows;
  },

  /**
   * Run full conflict analysis for a new project
   * Returns: { conflicts: [], warranties: [], affectedOrgs: [] }
   */
  async analyzeProject(lng, lat) {
    const conflicts = await this.findConflicts(lng, lat, 500);
    const warranties = await this.checkWarranties(lng, lat, 100);

    // Get unique affected organizations
    const orgIds = [...new Set(conflicts.map(c => c.org_id))];
    const affectedOrgs = [];

    for (const orgId of orgIds) {
      const orgResult = await db.query(
        'SELECT id, name, type, contact_email FROM organizations WHERE id = $1',
        [orgId]
      );
      if (orgResult.rows.length > 0) {
        affectedOrgs.push({
          ...orgResult.rows[0],
          conflicting_assets: conflicts.filter(c => c.org_id === orgId)
        });
      }
    }

    return {
      conflicts,
      warranties,
      affectedOrgs,
      hasConflicts: conflicts.length > 0,
      hasWarrantyConflicts: warranties.length > 0
    };
  },

  /**
   * Auto-invite affected organizations to a project
   */
  async autoInviteOrgs(projectId, affectedOrgs) {
    const invites = [];
    for (const org of affectedOrgs) {
      try {
        await db.query(
          `INSERT INTO project_participants (project_id, org_id, scope, status)
           VALUES ($1, $2, $3, 'invited')
           ON CONFLICT (project_id, org_id) DO NOTHING`,
          [projectId, org.id, `Potential conflict with ${org.conflicting_assets.map(a => a.asset_type).join(', ')}`]
        );
        invites.push(org);
      } catch (err) {
        console.error(`Failed to invite org ${org.id}:`, err.message);
      }
    }
    return invites;
  }
};

module.exports = geoConflict;
