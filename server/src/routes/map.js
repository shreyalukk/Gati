const express = require('express');
const db = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/map/projects — GeoJSON of all projects for map rendering
router.get('/projects', optionalAuth, async (req, res, next) => {
  try {
    const { city, status, workType, startDate, endDate } = req.query;

    let where = [];
    let params = [];
    let idx = 1;

    if (city) { where.push(`p.city = $${idx++}`); params.push(city); }
    if (status) { where.push(`p.status = $${idx++}`); params.push(status); }
    if (workType) { where.push(`p.work_type = $${idx++}`); params.push(workType); }
    if (startDate) { where.push(`p.start_date >= $${idx++}`); params.push(startDate); }
    if (endDate) { where.push(`p.end_date <= $${idx++}`); params.push(endDate); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const result = await db.query(
      `SELECT p.id, p.title, p.work_type, p.status, p.city, p.address,
              p.start_date, p.end_date,
              ST_X(p.location) as lng, ST_Y(p.location) as lat,
              o.name as lead_org_name,
              (SELECT COUNT(*) FROM project_participants pp WHERE pp.project_id = p.id) as participants
       FROM projects p
       LEFT JOIN organizations o ON p.lead_org_id = o.id
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );

    // Convert to GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(row.lng), parseFloat(row.lat)]
        },
        properties: {
          id: row.id,
          title: row.title,
          workType: row.work_type,
          status: row.status,
          city: row.city,
          address: row.address,
          startDate: row.start_date,
          endDate: row.end_date,
          leadOrgName: row.lead_org_name,
          participants: parseInt(row.participants)
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    next(err);
  }
});

// GET /api/map/assets — GeoJSON of utility assets
router.get('/assets', optionalAuth, async (req, res, next) => {
  try {
    const { city, assetType } = req.query;

    let where = [];
    let params = [];
    let idx = 1;

    if (city) { where.push(`ua.city = $${idx++}`); params.push(city); }
    if (assetType) { where.push(`ua.asset_type = $${idx++}`); params.push(assetType); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const result = await db.query(
      `SELECT ua.id, ua.asset_type, ua.description, ua.city, ua.depth_meters,
              ST_AsGeoJSON(ua.geometry) as geojson,
              o.name as org_name
       FROM utility_assets ua
       JOIN organizations o ON ua.org_id = o.id
       ${whereClause}`,
      params
    );

    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        geometry: JSON.parse(row.geojson),
        properties: {
          id: row.id,
          assetType: row.asset_type,
          description: row.description,
          city: row.city,
          depthMeters: row.depth_meters,
          orgName: row.org_name
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    next(err);
  }
});

// GET /api/map/warranties — GeoJSON of road warranty zones
router.get('/warranties', optionalAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT rw.id, rw.warranty_start, rw.warranty_end, rw.no_dig_flag, rw.city,
              ST_AsGeoJSON(rw.geometry) as geojson,
              p.title as project_title
       FROM road_warranties rw
       LEFT JOIN projects p ON rw.project_id = p.id
       WHERE rw.no_dig_flag = true AND rw.warranty_end > CURRENT_DATE`
    );

    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        geometry: JSON.parse(row.geojson),
        properties: {
          id: row.id,
          projectTitle: row.project_title,
          warrantyStart: row.warranty_start,
          warrantyEnd: row.warranty_end,
          noDig: row.no_dig_flag,
          city: row.city
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
