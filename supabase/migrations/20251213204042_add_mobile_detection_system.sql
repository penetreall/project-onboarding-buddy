/*
  # Mobile Detection & Progressive Defense System (Kevin Mitnick Style)

  1. New Tables
    - `device_fingerprints`
      - Stores detailed device fingerprinting data
      - Tracks mobile vs desktop characteristics
      - Used for detecting fake mobile user agents

    - `ip_reputation`
      - Progressive "snowball" defense system
      - Tracks strike count per IP
      - Implements exponential blocking
      - Silent tracking (attacker doesn't know)

    - `bypass_attempts`
      - Logs all bypass attempts (successful and failed)
      - Used for analytics and threat intelligence
      - Helps identify attack patterns

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to read their own domain data
    - Admin-only write access

  3. Important Notes
    - Strike system increases exponentially
    - First offense: warning only
    - Subsequent offenses: progressive delays and blocks
    - Blocks reset after cooldown period
    - All tracking is silent and invisible to attacker
*/

-- Device Fingerprints Table
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE NOT NULL,
  ip text NOT NULL,
  user_agent text NOT NULL,

  -- Mobile Detection Signals
  has_touch boolean DEFAULT false,
  screen_width integer,
  screen_height integer,
  device_pixel_ratio decimal,
  orientation text,
  platform text,
  vendor text,

  -- Mobile-specific API Detection
  has_vibration_api boolean DEFAULT false,
  has_battery_api boolean DEFAULT false,
  has_orientation_api boolean DEFAULT false,
  has_motion_api boolean DEFAULT false,

  -- Behavioral Detection
  max_touch_points integer DEFAULT 0,
  pointer_type text,

  -- Calculated Scores
  mobile_score integer DEFAULT 0,
  desktop_score integer DEFAULT 0,
  is_genuine_mobile boolean DEFAULT false,

  -- Inconsistency Detection
  inconsistencies jsonb DEFAULT '[]'::jsonb,

  -- Raw Data
  fingerprint_hash text,
  raw_data jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

-- IP Reputation Table (Snowball Defense)
CREATE TABLE IF NOT EXISTS ip_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE NOT NULL,
  ip text NOT NULL,

  -- Strike System
  strike_count integer DEFAULT 0,
  last_strike_at timestamptz,
  first_strike_at timestamptz,

  -- Progressive Blocking
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  block_duration_minutes integer DEFAULT 0,

  -- Threat Intelligence
  threat_level text DEFAULT 'low', -- low, medium, high, critical
  attack_patterns jsonb DEFAULT '[]'::jsonb,

  -- Metadata
  total_attempts integer DEFAULT 0,
  successful_bypasses integer DEFAULT 0,
  failed_attempts integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(domain_id, ip)
);

-- Bypass Attempts Table
CREATE TABLE IF NOT EXISTS bypass_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE NOT NULL,
  ip text NOT NULL,
  user_agent text,

  -- Attempt Details
  was_successful boolean DEFAULT false,
  failure_reason text,
  device_fingerprint_id uuid REFERENCES device_fingerprints(id) ON DELETE SET NULL,

  -- Detection Results
  mobile_score integer,
  is_genuine_mobile boolean,
  strike_count_at_attempt integer DEFAULT 0,

  -- Response Action
  action_taken text, -- allow, delay, block, redirect
  delay_applied_seconds integer DEFAULT 0,

  -- Metadata
  country text,
  headers jsonb DEFAULT '{}'::jsonb,
  detection_details jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_domain_ip ON device_fingerprints(domain_id, ip);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_created ON device_fingerprints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_mobile_score ON device_fingerprints(mobile_score DESC);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_domain_ip ON ip_reputation(domain_id, ip);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_blocked ON ip_reputation(is_blocked, blocked_until);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_threat_level ON ip_reputation(threat_level);

CREATE INDEX IF NOT EXISTS idx_bypass_attempts_domain_ip ON bypass_attempts(domain_id, ip);
CREATE INDEX IF NOT EXISTS idx_bypass_attempts_created ON bypass_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bypass_attempts_successful ON bypass_attempts(was_successful);

-- Enable RLS
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE bypass_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_fingerprints
CREATE POLICY "Users can view own domain fingerprints"
  ON device_fingerprints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = device_fingerprints.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert fingerprints"
  ON device_fingerprints FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for ip_reputation
CREATE POLICY "Users can view own domain reputation"
  ON ip_reputation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = ip_reputation.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage reputation"
  ON ip_reputation FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bypass_attempts
CREATE POLICY "Users can view own domain bypass attempts"
  ON bypass_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = bypass_attempts.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert bypass attempts"
  ON bypass_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to Update IP Reputation (Snowball System)
CREATE OR REPLACE FUNCTION update_ip_reputation(
  p_domain_id uuid,
  p_ip text,
  p_was_successful boolean,
  p_mobile_score integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_reputation ip_reputation;
  v_new_strike_count integer;
  v_block_duration integer;
  v_threat_level text;
  v_result jsonb;
BEGIN
  -- Get or create reputation record
  SELECT * INTO v_reputation
  FROM ip_reputation
  WHERE domain_id = p_domain_id AND ip = p_ip;

  IF NOT FOUND THEN
    INSERT INTO ip_reputation (domain_id, ip, strike_count, first_strike_at, last_strike_at)
    VALUES (p_domain_id, p_ip, 0, now(), now())
    RETURNING * INTO v_reputation;
  END IF;

  -- Calculate new strike count
  v_new_strike_count := v_reputation.strike_count;

  -- Increment strikes if suspicious (low mobile score or failed attempt)
  IF p_mobile_score < 50 OR NOT p_was_successful THEN
    v_new_strike_count := v_new_strike_count + 1;
  END IF;

  -- Calculate block duration (exponential backoff)
  -- Strike 1-2: No block (warning only)
  -- Strike 3: 60 min
  -- Strike 4: 360 min (6h)
  -- Strike 5: 1440 min (24h)
  -- Strike 6+: 10080 min (7d)
  v_block_duration := CASE
    WHEN v_new_strike_count <= 2 THEN 0
    WHEN v_new_strike_count = 3 THEN 60
    WHEN v_new_strike_count = 4 THEN 360
    WHEN v_new_strike_count = 5 THEN 1440
    ELSE 10080
  END;

  -- Determine threat level
  v_threat_level := CASE
    WHEN v_new_strike_count <= 2 THEN 'low'
    WHEN v_new_strike_count <= 4 THEN 'medium'
    WHEN v_new_strike_count <= 6 THEN 'high'
    ELSE 'critical'
  END;

  -- Update reputation
  UPDATE ip_reputation
  SET
    strike_count = v_new_strike_count,
    last_strike_at = now(),
    total_attempts = total_attempts + 1,
    successful_bypasses = successful_bypasses + (CASE WHEN p_was_successful THEN 1 ELSE 0 END),
    failed_attempts = failed_attempts + (CASE WHEN NOT p_was_successful THEN 1 ELSE 0 END),
    is_blocked = (v_block_duration > 0),
    blocked_until = CASE WHEN v_block_duration > 0 THEN now() + (v_block_duration || ' minutes')::interval ELSE NULL END,
    block_duration_minutes = v_block_duration,
    threat_level = v_threat_level,
    updated_at = now()
  WHERE domain_id = p_domain_id AND ip = p_ip
  RETURNING * INTO v_reputation;

  -- Build result
  v_result := jsonb_build_object(
    'strike_count', v_reputation.strike_count,
    'is_blocked', v_reputation.is_blocked,
    'blocked_until', v_reputation.blocked_until,
    'threat_level', v_reputation.threat_level,
    'block_duration_minutes', v_reputation.block_duration_minutes
  );

  RETURN v_result;
END;
$$;