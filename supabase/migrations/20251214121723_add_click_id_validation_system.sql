/*
  # Click-ID First Principle - Economic Click Validation

  ## Philosophy Change
  - OLD: Let humans pass
  - NEW: Let VALID ECONOMIC CLICKS pass
  - UTMs alone are NOT economic signals
  - Click-IDs are the PRIMARY validation factor

  ## 1. New Tables
    - `click_id_validation_rules` - Network-specific validation rules
    - `click_id_observations` - Track every click-id seen
    - `click_id_network_patterns` - Learning table for legitimate patterns

  ## 2. Security
    - Enable RLS on all tables
    - Users see only their domain data
    - System can write all observations

  ## 3. Validation Layers
    1. Click-ID presence (gclid, fbclid, ttclid)
    2. Format validation (length, entropy)
    3. Timing coherence (first-hit)
    4. Reuse detection
    5. Network coherence (referer matches)
*/

-- Create click_id_validation_rules table
CREATE TABLE IF NOT EXISTS click_id_validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL UNIQUE,
  click_id_param text NOT NULL,
  min_length int NOT NULL DEFAULT 10,
  max_length int NOT NULL DEFAULT 200,
  min_entropy real NOT NULL DEFAULT 3.0,
  allowed_chars text NOT NULL DEFAULT 'alphanumeric',
  pattern_regex text,
  requires_referer boolean DEFAULT false,
  referer_pattern text,
  priority int NOT NULL DEFAULT 100,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create click_id_observations table
CREATE TABLE IF NOT EXISTS click_id_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES protected_domains(id) ON DELETE CASCADE,
  click_id text NOT NULL,
  network text NOT NULL,
  ip text NOT NULL,
  user_agent text,
  referer text,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  hit_count int DEFAULT 1,
  is_valid boolean DEFAULT true,
  validation_errors jsonb DEFAULT '[]'::jsonb,
  timing_coherent boolean DEFAULT true,
  entropy_score real,
  created_at timestamptz DEFAULT now()
);

-- Create click_id_network_patterns table
CREATE TABLE IF NOT EXISTS click_id_network_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  pattern_type text NOT NULL,
  observed_pattern jsonb NOT NULL,
  confidence real DEFAULT 0.5,
  sample_count int DEFAULT 1,
  last_observed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(network, pattern_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_click_id_observations_domain
  ON click_id_observations(domain_id);

CREATE INDEX IF NOT EXISTS idx_click_id_observations_click_id
  ON click_id_observations(click_id);

CREATE INDEX IF NOT EXISTS idx_click_id_observations_ip
  ON click_id_observations(ip);

CREATE INDEX IF NOT EXISTS idx_click_id_observations_network
  ON click_id_observations(network);

CREATE INDEX IF NOT EXISTS idx_click_id_observations_created
  ON click_id_observations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_id_network_patterns_network
  ON click_id_network_patterns(network);

-- Enable RLS
ALTER TABLE click_id_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_id_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_id_network_patterns ENABLE ROW LEVEL SECURITY;

-- RLS for click_id_validation_rules
CREATE POLICY "Anyone can read validation rules"
  ON click_id_validation_rules FOR SELECT
  TO authenticated
  USING (true);

-- RLS for click_id_observations
CREATE POLICY "Users can view own domain click-id observations"
  ON click_id_observations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = click_id_observations.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert click-id observations"
  ON click_id_observations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update click-id observations"
  ON click_id_observations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS for click_id_network_patterns
CREATE POLICY "Anyone can read network patterns"
  ON click_id_network_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert network patterns"
  ON click_id_network_patterns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update network patterns"
  ON click_id_network_patterns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default validation rules
INSERT INTO click_id_validation_rules (network, click_id_param, min_length, max_length, min_entropy, allowed_chars, requires_referer, referer_pattern, priority) VALUES
  ('google_ads', 'gclid', 20, 200, 3.5, 'alphanumeric_dash_underscore', true, 'google\\.com', 100),
  ('facebook', 'fbclid', 20, 200, 3.5, 'alphanumeric_dash_underscore', true, 'facebook\\.com|fb\\.com', 90),
  ('tiktok', 'ttclid', 15, 200, 3.5, 'alphanumeric_dash_underscore', true, 'tiktok\\.com', 85),
  ('kwai', 'click_id', 10, 200, 3.0, 'alphanumeric_dash_underscore', false, 'kwai\\.com', 80),
  ('microsoft_ads', 'msclkid', 20, 200, 3.5, 'alphanumeric_dash_underscore', true, 'bing\\.com|msn\\.com', 75),
  ('taboola', 'tblci', 15, 200, 3.0, 'alphanumeric_dash_underscore', false, 'taboola\\.com', 70),
  ('outbrain', 'obclid', 15, 200, 3.0, 'alphanumeric_dash_underscore', false, 'outbrain\\.com', 70)
ON CONFLICT (network) DO NOTHING;

-- Function to calculate entropy
CREATE OR REPLACE FUNCTION calculate_entropy(input_text text)
RETURNS real AS $$
DECLARE
  char_count int;
  total_chars int;
  entropy real := 0;
  char_freq real;
BEGIN
  total_chars := length(input_text);
  IF total_chars = 0 THEN RETURN 0; END IF;

  FOR char_count IN
    SELECT count(*)::int
    FROM regexp_split_to_table(input_text, '')
    GROUP BY regexp_split_to_table
  LOOP
    char_freq := char_count::real / total_chars::real;
    entropy := entropy - (char_freq * ln(char_freq) / ln(2));
  END LOOP;

  RETURN entropy;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate click-id format
CREATE OR REPLACE FUNCTION validate_click_id(
  click_id_value text,
  network_name text
)
RETURNS jsonb AS $$
DECLARE
  rule record;
  validation_result jsonb := '{"valid": true, "errors": []}'::jsonb;
  entropy real;
  length_val int;
BEGIN
  SELECT * INTO rule
  FROM click_id_validation_rules
  WHERE network = network_name
  AND enabled = true;

  IF NOT FOUND THEN
    validation_result := jsonb_set(validation_result, '{valid}', 'false');
    validation_result := jsonb_set(
      validation_result,
      '{errors}',
      validation_result->'errors' || '["unknown_network"]'::jsonb
    );
    RETURN validation_result;
  END IF;

  length_val := length(click_id_value);
  IF length_val < rule.min_length OR length_val > rule.max_length THEN
    validation_result := jsonb_set(validation_result, '{valid}', 'false');
    validation_result := jsonb_set(
      validation_result,
      '{errors}',
      validation_result->'errors' || '["invalid_length"]'::jsonb
    );
  END IF;

  entropy := calculate_entropy(click_id_value);
  IF entropy < rule.min_entropy THEN
    validation_result := jsonb_set(validation_result, '{valid}', 'false');
    validation_result := jsonb_set(
      validation_result,
      '{errors}',
      validation_result->'errors' || '["low_entropy"]'::jsonb
    );
  END IF;

  validation_result := jsonb_set(
    validation_result,
    '{entropy}',
    to_jsonb(entropy)
  );

  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;
