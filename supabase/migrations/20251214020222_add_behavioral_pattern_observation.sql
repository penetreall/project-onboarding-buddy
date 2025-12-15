/*
  # Behavioral Pattern Observation System (Shadow Mode)

  1. Purpose
    - Passive aggregation of behavioral patterns for hypothesis validation
    - Zero impact on production traffic (observation only)
    - Validate pattern separability, stability, and recurrence

  2. New Tables
    - `behavioral_patterns`
      - `id` (uuid, primary key)
      - `pattern_hash` (text, unique) - deterministic hash of feature vector
      - `traffic_classification` (text) - 'legitimate', 'suspicious', 'blocked'
      - `feature_vector` (jsonb) - aggregated behavioral features (no PII)
      - `occurrence_count` (integer) - number of times pattern observed
      - `first_seen` (timestamptz) - first observation timestamp
      - `last_seen` (timestamptz) - most recent observation timestamp
      - `metadata` (jsonb) - optional additional context

  3. Security
    - Enable RLS on `behavioral_patterns` table
    - System can insert/update patterns
    - Authenticated users can read (for dashboard)

  4. Functions
    - `upsert_behavioral_pattern` - efficient upsert with aggregation

  5. Important Notes
    - No PII stored (no IPs, full user agents, specific URLs)
    - Patterns are hashed and irreversible
    - This system is purely observational - no response modifications
    - All operations are async and fail-safe
*/

-- Create behavioral patterns table
CREATE TABLE IF NOT EXISTS behavioral_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  pattern_hash TEXT UNIQUE NOT NULL,
  traffic_classification TEXT NOT NULL CHECK (traffic_classification IN ('legitimate', 'suspicious', 'blocked')),

  feature_vector JSONB NOT NULL,

  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_behavioral_pattern_hash ON behavioral_patterns(pattern_hash);
CREATE INDEX IF NOT EXISTS idx_behavioral_classification ON behavioral_patterns(traffic_classification);
CREATE INDEX IF NOT EXISTS idx_behavioral_last_seen ON behavioral_patterns(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_behavioral_occurrence ON behavioral_patterns(occurrence_count DESC);

-- Enable RLS
ALTER TABLE behavioral_patterns ENABLE ROW LEVEL SECURITY;

-- System can insert patterns (service role)
CREATE POLICY "System can insert patterns"
  ON behavioral_patterns FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update patterns (service role)
CREATE POLICY "System can update patterns"
  ON behavioral_patterns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read patterns (dashboard)
CREATE POLICY "Authenticated users can read patterns"
  ON behavioral_patterns FOR SELECT
  TO authenticated
  USING (true);

-- Upsert function for efficient pattern aggregation
CREATE OR REPLACE FUNCTION upsert_behavioral_pattern(
  p_pattern_hash TEXT,
  p_classification TEXT,
  p_features JSONB
) RETURNS void AS $$
BEGIN
  INSERT INTO behavioral_patterns (
    pattern_hash,
    traffic_classification,
    feature_vector,
    occurrence_count,
    first_seen,
    last_seen
  ) VALUES (
    p_pattern_hash,
    p_classification,
    p_features,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (pattern_hash) DO UPDATE SET
    occurrence_count = behavioral_patterns.occurrence_count + 1,
    last_seen = NOW(),
    traffic_classification = CASE
      WHEN p_classification = 'blocked' THEN 'blocked'
      WHEN p_classification = 'suspicious' AND behavioral_patterns.traffic_classification = 'legitimate'
        THEN 'suspicious'
      ELSE behavioral_patterns.traffic_classification
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;