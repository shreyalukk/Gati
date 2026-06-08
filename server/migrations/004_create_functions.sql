-- ============================================
-- Geo-Conflict Detection Function
-- Returns utility assets within a given radius of a point
-- ============================================
CREATE OR REPLACE FUNCTION find_conflicting_assets(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
  asset_id UUID,
  org_id UUID,
  org_name VARCHAR(255),
  asset_type VARCHAR(50),
  description TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.id AS asset_id,
    ua.org_id,
    o.name AS org_name,
    ua.asset_type,
    ua.description,
    ST_Distance(
      ua.geometry::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_meters
  FROM utility_assets ua
  JOIN organizations o ON ua.org_id = o.id
  WHERE ST_DWithin(
    ua.geometry::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_meters
  )
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Road Warranty Check Function
-- Returns active warranties near a point
-- ============================================
CREATE OR REPLACE FUNCTION check_road_warranty(
  p_lng DOUBLE PRECISION,
  p_lat DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 100
)
RETURNS TABLE (
  warranty_id UUID,
  project_id UUID,
  warranty_end DATE,
  no_dig_flag BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rw.id AS warranty_id,
    rw.project_id,
    rw.warranty_end,
    rw.no_dig_flag
  FROM road_warranties rw
  WHERE rw.no_dig_flag = true
    AND rw.warranty_end > CURRENT_DATE
    AND ST_DWithin(
      rw.geometry::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Compliance Score Recalculation
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_compliance_score(p_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 50;
  posted_before_start INTEGER;
  responded_to_invites INTEGER;
  completed_on_time INTEGER;
  violation_count INTEGER;
  total_projects INTEGER;
BEGIN
  -- Projects posted before start date (+20 max)
  SELECT COUNT(*) INTO posted_before_start
  FROM projects
  WHERE lead_org_id = p_org_id
    AND created_at::date <= start_date;

  SELECT COUNT(*) INTO total_projects
  FROM projects WHERE lead_org_id = p_org_id;

  IF total_projects > 0 THEN
    score := score + (posted_before_start * 20 / total_projects);
  END IF;

  -- Responded to coordination invites (+20 max)
  SELECT COUNT(*) INTO responded_to_invites
  FROM project_participants
  WHERE org_id = p_org_id AND status IN ('joined', 'opted_out', 'signed_off');

  DECLARE total_invites INTEGER;
  BEGIN
    SELECT COUNT(*) INTO total_invites
    FROM project_participants WHERE org_id = p_org_id;

    IF total_invites > 0 THEN
      score := score + (responded_to_invites * 20 / total_invites);
    END IF;
  END;

  -- Completed on time (+20 max)
  SELECT COUNT(*) INTO completed_on_time
  FROM projects
  WHERE lead_org_id = p_org_id
    AND status = 'completed'
    AND completed_at::date <= end_date;

  DECLARE completed_total INTEGER;
  BEGIN
    SELECT COUNT(*) INTO completed_total
    FROM projects
    WHERE lead_org_id = p_org_id AND status = 'completed';

    IF completed_total > 0 THEN
      score := score + (completed_on_time * 20 / completed_total);
    END IF;
  END;

  -- Violations (-30 each, min 0)
  SELECT COUNT(*) INTO violation_count
  FROM violations v
  JOIN projects p ON v.project_id = p.id
  WHERE p.lead_org_id = p_org_id AND v.status = 'confirmed';

  score := GREATEST(0, score - (violation_count * 30));
  score := LEAST(100, score);

  -- Update the organization record
  UPDATE organizations SET compliance_score = score, updated_at = NOW()
  WHERE id = p_org_id;

  RETURN score;
END;
$$ LANGUAGE plpgsql;
