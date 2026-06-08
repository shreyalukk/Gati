const db = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Seeding Gati database...\n');

  try {
    // Clean existing data
    await db.query('DELETE FROM messages');
    await db.query('DELETE FROM notifications');
    await db.query('DELETE FROM updates');
    await db.query('DELETE FROM violations');
    await db.query('DELETE FROM project_participants');
    await db.query('DELETE FROM road_warranties');
    await db.query('DELETE FROM utility_assets');
    await db.query('DELETE FROM projects');
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM organizations');

    console.log('  🧹 Cleaned existing data');

    // ========================================
    // Organizations
    // ========================================
    const orgs = await db.query(`
      INSERT INTO organizations (id, name, type, contact_email, contact_phone, city, compliance_score, verified) VALUES
        ('a0000001-0000-0000-0000-000000000001', 'BBMP (Bruhat Bengaluru Mahanagara Palike)', 'municipal', 'contact@bbmp.gov.in', '+919876543210', 'Bengaluru', 78, true),
        ('a0000001-0000-0000-0000-000000000002', 'BWSSB (Bangalore Water Supply and Sewerage Board)', 'government', 'info@bwssb.gov.in', '+919876543211', 'Bengaluru', 65, true),
        ('a0000001-0000-0000-0000-000000000003', 'Reliance Jio Infocomm', 'private', 'infra@jio.com', '+919876543212', 'Mumbai', 82, true),
        ('a0000001-0000-0000-0000-000000000004', 'BESCOM (Bangalore Electricity Supply Company)', 'government', 'contact@bescom.co.in', '+919876543213', 'Bengaluru', 71, true),
        ('a0000001-0000-0000-0000-000000000005', 'GAIL (India) Limited', 'government', 'contact@gail.co.in', '+919876543214', 'Delhi', 88, true),
        ('a0000001-0000-0000-0000-000000000006', 'Bharti Airtel Limited', 'private', 'infra@airtel.in', '+919876543215', 'Delhi', 74, true)
      RETURNING id, name
    `);
    console.log('  🏢 Created', orgs.rows.length, 'organizations');

    // ========================================
    // Users
    // ========================================
    const passwordHash = await bcrypt.hash('password123', 10);
    const users = await db.query(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, org_id) VALUES
        ('b0000001-0000-0000-0000-000000000001', 'admin@gati.gov.in', '${passwordHash}', 'Priya Sharma', '+919900000001', 'admin', NULL),
        ('b0000001-0000-0000-0000-000000000002', 'ramesh@bbmp.gov.in', '${passwordHash}', 'Ramesh Kumar', '+919900000002', 'government', 'a0000001-0000-0000-0000-000000000001'),
        ('b0000001-0000-0000-0000-000000000003', 'suresh@bwssb.gov.in', '${passwordHash}', 'Suresh Babu', '+919900000003', 'government', 'a0000001-0000-0000-0000-000000000002'),
        ('b0000001-0000-0000-0000-000000000004', 'amit@jio.com', '${passwordHash}', 'Amit Patel', '+919900000004', 'contractor', 'a0000001-0000-0000-0000-000000000003'),
        ('b0000001-0000-0000-0000-000000000005', 'vikram@bescom.co.in', '${passwordHash}', 'Vikram Singh', '+919900000005', 'contractor', 'a0000001-0000-0000-0000-000000000004'),
        ('b0000001-0000-0000-0000-000000000006', 'neha@citizen.in', '${passwordHash}', 'Neha Gupta', '+919900000006', 'citizen', NULL)
      RETURNING id, full_name, role
    `);
    console.log('  👤 Created', users.rows.length, 'users');

    // ========================================
    // Projects (10 across 3 cities)
    // ========================================
    const projects = await db.query(`
      INSERT INTO projects (id, title, description, work_type, status, location, address, city, pincode, start_date, end_date, lead_org_id, created_by, coordination_deadline) VALUES
        -- Bengaluru projects
        ('c0000001-0000-0000-0000-000000000001',
         'MG Road Metro Corridor Utility Relocation',
         'Major utility relocation project along MG Road for Metro Phase 3 expansion. Requires coordination with water, telecom, and power utilities.',
         'pipeline', 'coordination',
         ST_SetSRID(ST_MakePoint(77.6065, 12.9753), 4326),
         'MG Road, Bengaluru', 'Bengaluru', '560001',
         '2026-07-01', '2026-12-31',
         'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002',
         NOW() + INTERVAL '14 days'),

        ('c0000001-0000-0000-0000-000000000002',
         'Koramangala Water Main Replacement',
         'Replacement of aging 40-year-old water main along 80 Feet Road. BWSSB lead project with road restoration.',
         'pipeline', 'in_progress',
         ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326),
         '80 Feet Road, Koramangala', 'Bengaluru', '560034',
         '2026-05-15', '2026-09-30',
         'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000003',
         '2026-05-01'),

        ('c0000001-0000-0000-0000-000000000003',
         'Indiranagar 5G Fiber Backbone',
         'Jio fiber optic cable laying for 5G network backbone along 100 Feet Road and CMH Road.',
         'cable', 'posted',
         ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326),
         '100 Feet Road, Indiranagar', 'Bengaluru', '560038',
         '2026-08-01', '2026-11-30',
         'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004',
         NOW() + INTERVAL '14 days'),

        ('c0000001-0000-0000-0000-000000000004',
         'Whitefield Road Resurfacing & Drainage',
         'Complete road resurfacing with new stormwater drainage system. Joint project with BBMP.',
         'road', 'completed',
         ST_SetSRID(ST_MakePoint(77.7500, 12.9698), 4326),
         'Whitefield Main Road', 'Bengaluru', '560066',
         '2025-11-01', '2026-03-31',
         'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002',
         '2025-10-15'),

        -- Mumbai projects
        ('c0000001-0000-0000-0000-000000000005',
         'Andheri-Jogeshwari Link Road Gas Pipeline',
         'GAIL high-pressure gas pipeline installation along the link road. Critical infrastructure project.',
         'pipeline', 'approved',
         ST_SetSRID(ST_MakePoint(72.8362, 19.1364), 4326),
         'Andheri-Jogeshwari Link Road', 'Mumbai', '400053',
         '2026-07-15', '2027-01-31',
         'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000002',
         '2026-06-01'),

        ('c0000001-0000-0000-0000-000000000006',
         'BKC Smart Road Project',
         'Smart road infrastructure with embedded sensors, LED lighting, and fiber connectivity. Flagship project.',
         'road', 'in_progress',
         ST_SetSRID(ST_MakePoint(72.8601, 19.0657), 4326),
         'Bandra Kurla Complex', 'Mumbai', '400051',
         '2026-04-01', '2026-10-31',
         'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004',
         '2026-03-15'),

        ('c0000001-0000-0000-0000-000000000007',
         'Powai Lake Area Drainage Overhaul',
         'Complete drainage system overhaul to prevent monsoon flooding near Powai Lake residential area.',
         'drainage', 'violation',
         ST_SetSRID(ST_MakePoint(72.9052, 19.1197), 4326),
         'Hiranandani Gardens, Powai', 'Mumbai', '400076',
         '2026-03-01', '2026-08-31',
         'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002',
         '2026-02-15'),

        -- Delhi projects
        ('c0000001-0000-0000-0000-000000000008',
         'Dwarka Expressway Telecom Duct',
         'Airtel underground telecom duct installation along Dwarka Expressway. Multi-carrier shared infrastructure.',
         'cable', 'coordination',
         ST_SetSRID(ST_MakePoint(77.0434, 28.5918), 4326),
         'Dwarka Expressway, Sector 21', 'Delhi', '110075',
         '2026-08-15', '2027-02-28',
         'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000004',
         NOW() + INTERVAL '14 days'),

        ('c0000001-0000-0000-0000-000000000009',
         'Connaught Place Underground Utility Mapping',
         'Comprehensive utility mapping and modernization of underground infrastructure in CP inner circle.',
         'other', 'posted',
         ST_SetSRID(ST_MakePoint(77.2195, 28.6315), 4326),
         'Connaught Place Inner Circle', 'Delhi', '110001',
         '2026-09-01', '2027-03-31',
         'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000002',
         NOW() + INTERVAL '14 days'),

        ('c0000001-0000-0000-0000-000000000010',
         'Nehru Place Power Grid Upgrade',
         'BESCOM high-voltage cable replacement and smart grid installation in commercial district.',
         'cable', 'completed',
         ST_SetSRID(ST_MakePoint(77.2507, 28.5491), 4326),
         'Nehru Place, New Delhi', 'Delhi', '110019',
         '2025-10-01', '2026-04-30',
         'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000005',
         '2025-09-15')
      RETURNING id, title, status, city
    `);
    console.log('  📋 Created', projects.rows.length, 'projects');

    // ========================================
    // Utility Assets (overlapping geometries for conflict demo)
    // ========================================
    const assets = await db.query(`
      INSERT INTO utility_assets (id, org_id, asset_type, geometry, description, city, depth_meters) VALUES
        -- BWSSB water pipelines in Bengaluru (overlapping with MG Road project)
        ('d0000001-0000-0000-0000-000000000001',
         'a0000001-0000-0000-0000-000000000002', 'water_pipeline',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.6000, 12.9750), ST_MakePoint(77.6150, 12.9760)), 4326),
         '600mm water main - MG Road trunk line', 'Bengaluru', 2.5),

        -- BESCOM power cables near MG Road
        ('d0000001-0000-0000-0000-000000000002',
         'a0000001-0000-0000-0000-000000000004', 'power_cable',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.6040, 12.9745), ST_MakePoint(77.6120, 12.9770)), 4326),
         '11kV HT underground cable - MG Road', 'Bengaluru', 1.2),

        -- Jio fiber in Indiranagar (overlapping with 5G project)
        ('d0000001-0000-0000-0000-000000000003',
         'a0000001-0000-0000-0000-000000000003', 'fiber_optic',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.6380, 12.9780), ST_MakePoint(77.6450, 12.9790)), 4326),
         'Existing FTTH backbone - 100 Feet Road', 'Bengaluru', 0.8),

        -- GAIL gas pipeline in Mumbai (overlapping with Andheri project)
        ('d0000001-0000-0000-0000-000000000004',
         'a0000001-0000-0000-0000-000000000005', 'gas_pipeline',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(72.8300, 19.1350), ST_MakePoint(72.8420, 19.1380)), 4326),
         'CNG distribution pipeline - Western Express Highway', 'Mumbai', 3.0),

        -- Airtel telecom in Mumbai (overlapping with BKC project)
        ('d0000001-0000-0000-0000-000000000005',
         'a0000001-0000-0000-0000-000000000006', 'telecom_cable',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(72.8580, 19.0650), ST_MakePoint(72.8650, 19.0670)), 4326),
         'Underground fiber duct - BKC connector', 'Mumbai', 1.0),

        -- BWSSB drainage in Koramangala (overlapping with water main project)
        ('d0000001-0000-0000-0000-000000000006',
         'a0000001-0000-0000-0000-000000000002', 'drainage',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.6200, 12.9340), ST_MakePoint(77.6300, 12.9360)), 4326),
         'Stormwater drain - 80 Feet Road', 'Bengaluru', 3.5),

        -- GAIL gas pipeline in Delhi (overlapping with Dwarka project)
        ('d0000001-0000-0000-0000-000000000007',
         'a0000001-0000-0000-0000-000000000005', 'gas_pipeline',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.0400, 28.5910), ST_MakePoint(77.0480, 28.5930)), 4326),
         'PNG distribution main - Dwarka Sector 21', 'Delhi', 2.8),

        -- Airtel cables in Delhi CP (overlapping with utility mapping project)
        ('d0000001-0000-0000-0000-000000000008',
         'a0000001-0000-0000-0000-000000000006', 'telecom_cable',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.2170, 28.6310), ST_MakePoint(77.2220, 28.6325)), 4326),
         'Multi-carrier underground duct - Connaught Place', 'Delhi', 1.5),

        -- BESCOM power in Whitefield
        ('d0000001-0000-0000-0000-000000000009',
         'a0000001-0000-0000-0000-000000000004', 'power_cable',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(77.7480, 12.9690), ST_MakePoint(77.7530, 12.9710)), 4326),
         '33kV feeder cable - Whitefield', 'Bengaluru', 1.5),

        -- Jio fiber in Powai
        ('d0000001-0000-0000-0000-000000000010',
         'a0000001-0000-0000-0000-000000000003', 'fiber_optic',
         ST_SetSRID(ST_MakeLine(ST_MakePoint(72.9030, 19.1190), ST_MakePoint(72.9080, 19.1210)), 4326),
         'FTTH distribution - Hiranandani Gardens', 'Mumbai', 0.6)
      RETURNING id, asset_type, city
    `);
    console.log('  🔧 Created', assets.rows.length, 'utility assets');

    // ========================================
    // Project Participants
    // ========================================
    await db.query(`
      INSERT INTO project_participants (project_id, org_id, scope, status, joined_at, signed_off_at) VALUES
        -- MG Road project participants
        ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Relocate 600mm water main along MG Road', 'joined', NOW(), NULL),
        ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004', 'Relocate 11kV underground cables', 'joined', NOW(), NULL),
        ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'Install shared telecom duct', 'invited', NULL, NULL),

        -- Koramangala project
        ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000004', 'Protect existing power cables during excavation', 'signed_off', NOW(), NOW()),
        ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003', 'Lay new fiber along trench', 'joined', NOW(), NULL),

        -- Whitefield (completed) - all signed off
        ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004', 'Power cable upgrade during road work', 'signed_off', NOW(), NOW()),
        ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'Water main protection', 'signed_off', NOW(), NOW()),

        -- BKC Smart Road
        ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000006', 'Install shared telecom infrastructure', 'joined', NOW(), NULL),
        ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000005', 'Gas pipeline safety audit', 'signed_off', NOW(), NOW()),

        -- Dwarka Expressway
        ('c0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000005', 'Gas pipeline protection measures', 'joined', NOW(), NULL),
        ('c0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000003', 'Shared duct installation', 'invited', NULL, NULL)
    `);
    console.log('  🤝 Created project participants');

    // ========================================
    // Road Warranties (for completed projects)
    // ========================================
    await db.query(`
      INSERT INTO road_warranties (project_id, geometry, warranty_start, warranty_end, no_dig_flag, city) VALUES
        ('c0000001-0000-0000-0000-000000000004',
         ST_SetSRID(ST_Buffer(ST_MakeLine(ST_MakePoint(77.7480, 12.9690), ST_MakePoint(77.7530, 12.9710))::geography, 20)::geometry, 4326),
         '2026-04-01', '2031-04-01', true, 'Bengaluru'),
        ('c0000001-0000-0000-0000-000000000010',
         ST_SetSRID(ST_Buffer(ST_MakeLine(ST_MakePoint(77.2490, 28.5485), ST_MakePoint(77.2525, 28.5500))::geography, 15)::geometry, 4326),
         '2026-05-01', '2031-05-01', true, 'Delhi')
    `);
    console.log('  🛡️  Created road warranties');

    // ========================================
    // Violations
    // ========================================
    await db.query(`
      INSERT INTO violations (project_id, reported_by, description, status, location, address, city) VALUES
        ('c0000001-0000-0000-0000-000000000007',
         'b0000001-0000-0000-0000-000000000006',
         'Road being dug without prior notice to residents. No safety barriers placed. Work being done at night disturbing residents.',
         'investigating',
         ST_SetSRID(ST_MakePoint(72.9055, 19.1200), 4326),
         'Near Hiranandani Hospital, Powai', 'Mumbai')
    `);
    console.log('  🚨 Created violations');

    // ========================================
    // Sample Updates
    // ========================================
    await db.query(`
      INSERT INTO updates (project_id, org_id, user_id, type, content) VALUES
        ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000003', 'milestone', 'Phase 1 excavation completed. 200m of old pipeline removed.'),
        ('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000003', 'photo', 'Site progress photo - junction at 5th Cross'),
        ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004', 'milestone', 'Smart sensor installation 40% complete'),
        ('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000004', 'gps', 'GPS checkin: Work front at BKC Junction'),
        ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 'status_change', 'Project moved to coordination phase. All stakeholders notified.'),
        ('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 'milestone', 'Road resurfacing completed. Warranty certificate issued.')
    `);
    console.log('  📝 Created project updates');

    // ========================================
    // Sample Notifications
    // ========================================
    await db.query(`
      INSERT INTO notifications (user_id, type, title, message, read, project_id) VALUES
        ('b0000001-0000-0000-0000-000000000003', 'conflict_alert', 'Utility Conflict Detected', 'Your water pipeline on MG Road conflicts with a new Metro project. Join the coordination room.', false, 'c0000001-0000-0000-0000-000000000001'),
        ('b0000001-0000-0000-0000-000000000004', 'coordination_invite', 'Coordination Invite', 'Jio has been invited to join the MG Road Metro project coordination.', false, 'c0000001-0000-0000-0000-000000000001'),
        ('b0000001-0000-0000-0000-000000000005', 'deadline_reminder', 'Deadline Approaching', 'BKC Smart Road Project milestone due in 3 days.', true, 'c0000001-0000-0000-0000-000000000006'),
        ('b0000001-0000-0000-0000-000000000002', 'violation_filed', 'Violation Report Filed', 'A citizen has reported unauthorized digging near Powai Lake.', false, 'c0000001-0000-0000-0000-000000000007')
    `);
    console.log('  🔔 Created notifications');

    console.log('\n✅ Seed data loaded successfully!');
    console.log('\n📋 Demo login credentials (all passwords: "password123"):');
    console.log('   Admin:      admin@gati.gov.in');
    console.log('   Government: ramesh@bbmp.gov.in');
    console.log('   Government: suresh@bwssb.gov.in');
    console.log('   Contractor: amit@jio.com');
    console.log('   Contractor: vikram@bescom.co.in');
    console.log('   Citizen:    neha@citizen.in');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

seed();
