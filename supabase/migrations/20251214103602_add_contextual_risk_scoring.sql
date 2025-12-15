/*
  # Contextual Risk Scoring System
  
  1. New Tables
    - `risk_assessments` - Stores individual risk assessments for each access
      - `id` (uuid, primary key)
      - `domain_id` (uuid, references protected_domains)
      - `ip` (text)
      - `platform_type` (text) - desktop, mobile, tablet, unknown
      - `raw_score` (numeric) - 0.0 to 1.0 where higher = more suspicious
      - `risk_factors` (jsonb) - detailed breakdown of risk factors
      - `decision` (text) - 'real', 'safe', 'safe_observe'
      - `coherence_score` (numeric) - header/behavior coherence
      - `human_noise_score` (numeric) - presence of human imperfections
      - `perfection_penalty` (numeric) - penalty for being "too perfect"
      - `created_at` (timestamptz)
    
    - `contradiction_signals` - Tracks contradiction test results
      - `id` (uuid, primary key)
      - `domain_id` (uuid)
      - `signal_type` (text) - type of contradiction test
      - `signal_value` (text) - expected vs actual
      - `detected_at` (timestamptz)
      - `ip` (text)
      - `was_human_response` (boolean)
    
    - `platform_risk_profiles` - Risk profiles per platform type
      - `id` (uuid, primary key)
      - `platform_type` (text) - desktop, mobile, tablet
      - `base_trust_score` (numeric) - base trust level
      - `requires_context` (boolean) - needs behavioral context
      - `direct_to_real_allowed` (boolean) - can go directly to real
      - `observation_intensity` (text) - low, medium, high
  
  2. New Functions
    - `compute_contextual_risk` - Calculates risk based on multiple factors
    - `detect_excessive_perfection` - Identifies patterns that are "too clean"
    - `evaluate_human_noise` - Scores presence of human imperfections
    - `make_destination_decision` - Final decision: real, safe, or safe_observe
  
  3. Security
    - Enable RLS on all new tables
    - Policies for authenticated users and service role
*/

-- Risk Assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE,
  ip text NOT NULL,
  user_agent text,
  platform_type text DEFAULT 'unknown',
  raw_score numeric DEFAULT 0.5,
  risk_factors jsonb DEFAULT '{}',
  decision text DEFAULT 'safe',
  coherence_score numeric DEFAULT 0.5,
  human_noise_score numeric DEFAULT 0.0,
  perfection_penalty numeric DEFAULT 0.0,
  temporal_variance numeric DEFAULT 0.0,
  navigation_depth integer DEFAULT 0,
  session_context jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage risk_assessments"
  ON risk_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view risk assessments for their domains"
  ON risk_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = risk_assessments.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

-- Contradiction Signals table
CREATE TABLE IF NOT EXISTS contradiction_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE,
  ip text NOT NULL,
  signal_type text NOT NULL,
  signal_value text,
  expected_behavior text,
  actual_behavior text,
  was_human_response boolean DEFAULT false,
  confidence numeric DEFAULT 0.5,
  detected_at timestamptz DEFAULT now()
);

ALTER TABLE contradiction_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage contradiction_signals"
  ON contradiction_signals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view contradiction signals for their domains"
  ON contradiction_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = contradiction_signals.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

-- Platform Risk Profiles table
CREATE TABLE IF NOT EXISTS platform_risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_type text UNIQUE NOT NULL,
  base_trust_score numeric DEFAULT 0.5,
  requires_context boolean DEFAULT true,
  direct_to_real_allowed boolean DEFAULT false,
  observation_intensity text DEFAULT 'medium',
  min_human_noise_required numeric DEFAULT 0.1,
  max_perfection_allowed numeric DEFAULT 0.8,
  context_weight numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage platform_risk_profiles"
  ON platform_risk_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read platform_risk_profiles"
  ON platform_risk_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert default platform risk profiles
INSERT INTO platform_risk_profiles (platform_type, base_trust_score, requires_context, direct_to_real_allowed, observation_intensity, min_human_noise_required, max_perfection_allowed, context_weight)
VALUES 
  ('desktop', 0.3, true, false, 'high', 0.15, 0.7, 1.5),
  ('mobile', 0.6, false, true, 'low', 0.05, 0.9, 0.8),
  ('tablet', 0.5, true, false, 'medium', 0.1, 0.8, 1.0),
  ('unknown', 0.2, true, false, 'high', 0.2, 0.6, 2.0)
ON CONFLICT (platform_type) DO UPDATE SET
  base_trust_score = EXCLUDED.base_trust_score,
  requires_context = EXCLUDED.requires_context,
  direct_to_real_allowed = EXCLUDED.direct_to_real_allowed,
  observation_intensity = EXCLUDED.observation_intensity,
  updated_at = now();

-- Function to compute contextual risk score
CREATE OR REPLACE FUNCTION compute_contextual_risk(
  p_platform_type text,
  p_coherence_score numeric,
  p_human_noise_score numeric,
  p_perfection_penalty numeric,
  p_temporal_variance numeric,
  p_passed_all_layers boolean
) RETURNS jsonb AS $$
DECLARE
  v_profile platform_risk_profiles%ROWTYPE;
  v_base_risk numeric;
  v_context_risk numeric;
  v_final_risk numeric;
  v_decision text;
  v_risk_breakdown jsonb;
BEGIN
  -- Get platform profile
  SELECT * INTO v_profile 
  FROM platform_risk_profiles 
  WHERE platform_type = p_platform_type;
  
  IF NOT FOUND THEN
    SELECT * INTO v_profile 
    FROM platform_risk_profiles 
    WHERE platform_type = 'unknown';
  END IF;
  
  -- Calculate base risk (inverse of trust)
  v_base_risk := 1.0 - v_profile.base_trust_score;
  
  -- Calculate context risk
  v_context_risk := (
    (1.0 - p_coherence_score) * 0.25 +
    (1.0 - p_human_noise_score) * 0.30 +
    p_perfection_penalty * 0.25 +
    (1.0 - LEAST(p_temporal_variance, 1.0)) * 0.20
  ) * v_profile.context_weight;
  
  -- Desktop hardening: even if passed all layers, apply context penalty
  IF p_platform_type = 'desktop' AND p_passed_all_layers THEN
    -- "Passing perfectly" on desktop is suspicious
    IF p_perfection_penalty < 0.1 AND p_human_noise_score < v_profile.min_human_noise_required THEN
      v_context_risk := v_context_risk + 0.3;
    END IF;
  END IF;
  
  -- Final risk score
  v_final_risk := (v_base_risk * 0.4) + (v_context_risk * 0.6);
  v_final_risk := LEAST(GREATEST(v_final_risk, 0.0), 1.0);
  
  -- Decision logic
  IF v_final_risk <= 0.3 AND p_human_noise_score >= v_profile.min_human_noise_required THEN
    IF v_profile.direct_to_real_allowed OR p_platform_type = 'mobile' THEN
      v_decision := 'real';
    ELSE
      v_decision := 'safe_observe';
    END IF;
  ELSIF v_final_risk <= 0.5 THEN
    v_decision := 'safe_observe';
  ELSE
    v_decision := 'safe';
  END IF;
  
  -- Desktop never goes directly to real without strong human signals
  IF p_platform_type = 'desktop' AND v_decision = 'real' THEN
    IF p_human_noise_score < 0.2 OR p_coherence_score < 0.7 THEN
      v_decision := 'safe_observe';
    END IF;
  END IF;
  
  -- Build risk breakdown
  v_risk_breakdown := jsonb_build_object(
    'final_risk', v_final_risk,
    'base_risk', v_base_risk,
    'context_risk', v_context_risk,
    'decision', v_decision,
    'factors', jsonb_build_object(
      'platform_trust', v_profile.base_trust_score,
      'coherence', p_coherence_score,
      'human_noise', p_human_noise_score,
      'perfection_penalty', p_perfection_penalty,
      'temporal_variance', p_temporal_variance
    ),
    'thresholds', jsonb_build_object(
      'min_human_noise_required', v_profile.min_human_noise_required,
      'max_perfection_allowed', v_profile.max_perfection_allowed,
      'requires_context', v_profile.requires_context
    )
  );
  
  RETURN v_risk_breakdown;
END;
$$ LANGUAGE plpgsql;

-- Function to detect excessive perfection
CREATE OR REPLACE FUNCTION detect_excessive_perfection(
  p_passed_all_layers boolean,
  p_header_count integer,
  p_response_time_ms integer,
  p_has_all_standard_headers boolean,
  p_navigation_linear boolean,
  p_timing_consistent boolean
) RETURNS numeric AS $$
DECLARE
  v_perfection_score numeric := 0.0;
  v_penalty numeric := 0.0;
BEGIN
  -- Perfect layer passage
  IF p_passed_all_layers THEN
    v_perfection_score := v_perfection_score + 0.2;
  END IF;
  
  -- "Perfect" header count (not too few, not too many)
  IF p_header_count BETWEEN 8 AND 15 THEN
    v_perfection_score := v_perfection_score + 0.15;
  END IF;
  
  -- Fast but not instant response (bot-like precision)
  IF p_response_time_ms BETWEEN 100 AND 500 THEN
    v_perfection_score := v_perfection_score + 0.15;
  END IF;
  
  -- Has all standard headers exactly as expected
  IF p_has_all_standard_headers THEN
    v_perfection_score := v_perfection_score + 0.2;
  END IF;
  
  -- Linear navigation (no exploration)
  IF p_navigation_linear THEN
    v_perfection_score := v_perfection_score + 0.15;
  END IF;
  
  -- Perfectly consistent timing
  IF p_timing_consistent THEN
    v_perfection_score := v_perfection_score + 0.15;
  END IF;
  
  -- Calculate penalty: perfection above 0.7 is suspicious
  IF v_perfection_score > 0.7 THEN
    v_penalty := (v_perfection_score - 0.7) * 2.0;
  ELSIF v_perfection_score > 0.5 THEN
    v_penalty := (v_perfection_score - 0.5) * 0.5;
  END IF;
  
  RETURN LEAST(v_penalty, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to evaluate human noise
CREATE OR REPLACE FUNCTION evaluate_human_noise(
  p_has_typo_corrections boolean,
  p_has_scroll_events boolean,
  p_has_mouse_movement boolean,
  p_has_timing_variance boolean,
  p_has_viewport_changes boolean,
  p_has_focus_blur boolean,
  p_navigation_non_linear boolean
) RETURNS numeric AS $$
DECLARE
  v_noise_score numeric := 0.0;
BEGIN
  -- Each human signal adds to the noise score
  IF p_has_typo_corrections THEN
    v_noise_score := v_noise_score + 0.15;
  END IF;
  
  IF p_has_scroll_events THEN
    v_noise_score := v_noise_score + 0.1;
  END IF;
  
  IF p_has_mouse_movement THEN
    v_noise_score := v_noise_score + 0.15;
  END IF;
  
  IF p_has_timing_variance THEN
    v_noise_score := v_noise_score + 0.2;
  END IF;
  
  IF p_has_viewport_changes THEN
    v_noise_score := v_noise_score + 0.1;
  END IF;
  
  IF p_has_focus_blur THEN
    v_noise_score := v_noise_score + 0.1;
  END IF;
  
  IF p_navigation_non_linear THEN
    v_noise_score := v_noise_score + 0.2;
  END IF;
  
  RETURN LEAST(v_noise_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_assessments_domain_id ON risk_assessments(domain_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON risk_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_decision ON risk_assessments(decision);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_platform ON risk_assessments(platform_type);
CREATE INDEX IF NOT EXISTS idx_contradiction_signals_domain ON contradiction_signals(domain_id);
CREATE INDEX IF NOT EXISTS idx_contradiction_signals_detected ON contradiction_signals(detected_at DESC);
