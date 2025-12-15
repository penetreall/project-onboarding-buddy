/*
  # SnowBallFy Security Platform Schema

  ## Overview
  Creates the foundational database structure for the SnowBallFy cybersecurity platform.
  This schema supports domain protection configuration, traffic analytics, and security logging.

  ## New Tables
  
  ### 1. `protected_domains`
  Stores domain configuration for protection systems
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `public_domain` (text) - Institutional/audit version URL
  - `protected_domain` (text) - Full content URL for verified users
  - `sensitivity_level` (text) - Protection sensitivity: low, medium, high, maximum
  - `status` (text) - active, paused, deleted
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `traffic_analytics`
  Records traffic patterns and behavioral analysis
  - `id` (uuid, primary key)
  - `domain_id` (uuid, references protected_domains)
  - `visitor_fingerprint` (text) - Anonymized visitor identifier
  - `trust_score` (integer) - Calculated trust score (0-100)
  - `request_count` (integer) - Number of requests in session
  - `interaction_metrics` (jsonb) - Mouse movement, scroll, timing data
  - `classification` (text) - legitimate, suspicious, bot
  - `timestamp` (timestamptz)

  ### 3. `security_logs`
  Detailed security event logging
  - `id` (uuid, primary key)
  - `domain_id` (uuid, references protected_domains)
  - `event_type` (text) - blocked_request, suspicious_pattern, rate_limit, etc.
  - `severity` (text) - info, warning, critical
  - `ip_address` (inet) - Request IP
  - `user_agent` (text) - Browser user agent
  - `details` (jsonb) - Additional event context
  - `timestamp` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own domain configurations
  - Policies enforce user isolation for all operations
*/

-- Create protected_domains table
CREATE TABLE IF NOT EXISTS protected_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  public_domain text NOT NULL,
  protected_domain text NOT NULL,
  sensitivity_level text NOT NULL DEFAULT 'medium' CHECK (sensitivity_level IN ('low', 'medium', 'high', 'maximum')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create traffic_analytics table
CREATE TABLE IF NOT EXISTS traffic_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE NOT NULL,
  visitor_fingerprint text NOT NULL,
  trust_score integer NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  request_count integer NOT NULL DEFAULT 1,
  interaction_metrics jsonb DEFAULT '{}',
  classification text NOT NULL DEFAULT 'unknown' CHECK (classification IN ('legitimate', 'suspicious', 'bot', 'unknown')),
  timestamp timestamptz DEFAULT now() NOT NULL
);

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address inet,
  user_agent text,
  details jsonb DEFAULT '{}',
  timestamp timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_protected_domains_user_id ON protected_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_protected_domains_status ON protected_domains(status);
CREATE INDEX IF NOT EXISTS idx_traffic_analytics_domain_id ON traffic_analytics(domain_id);
CREATE INDEX IF NOT EXISTS idx_traffic_analytics_timestamp ON traffic_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_domain_id ON security_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);

-- Enable Row Level Security
ALTER TABLE protected_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for protected_domains
CREATE POLICY "Users can view own domains"
  ON protected_domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domains"
  ON protected_domains FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains"
  ON protected_domains FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains"
  ON protected_domains FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for traffic_analytics
CREATE POLICY "Users can view analytics for own domains"
  ON traffic_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = traffic_analytics.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics"
  ON traffic_analytics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = traffic_analytics.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

-- RLS Policies for security_logs
CREATE POLICY "Users can view logs for own domains"
  ON security_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = security_logs.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert security logs"
  ON security_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = security_logs.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for protected_domains
CREATE TRIGGER update_protected_domains_updated_at
  BEFORE UPDATE ON protected_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();