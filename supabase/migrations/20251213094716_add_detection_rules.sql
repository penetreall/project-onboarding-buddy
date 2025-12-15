/*
  # Add Detection Rules System

  1. New Tables
    - `detection_rules`
      - `id` (uuid, primary key)
      - `domain_id` (uuid, foreign key to protected_domains)
      - `rule_type` (text) - tipo de regra (ip_blacklist, datacenter_block, vpn_block, etc)
      - `is_enabled` (boolean) - se a regra está ativa
      - `config` (jsonb) - configuração específica da regra
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `known_threats`
      - `id` (uuid, primary key)
      - `threat_type` (text) - vpn, datacenter, proxy, bot, crawler
      - `identifier` (text) - IP, ASN, user-agent pattern, etc
      - `severity` (text) - low, medium, high, critical
      - `metadata` (jsonb) - informações adicionais
      - `created_at` (timestamp)
  
  2. Changes
    - Add `detection_config` to protected_domains table
    - Add `detection_results` to domain_access_logs table
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create detection_rules table
CREATE TABLE IF NOT EXISTS detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES protected_domains(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create known_threats table
CREATE TABLE IF NOT EXISTS known_threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threat_type text NOT NULL,
  identifier text NOT NULL,
  severity text DEFAULT 'medium',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add detection_config to protected_domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'protected_domains' AND column_name = 'detection_config'
  ) THEN
    ALTER TABLE protected_domains ADD COLUMN detection_config jsonb DEFAULT '{
      "block_vpn": true,
      "block_datacenter": true,
      "block_proxy": true,
      "block_bots": true,
      "block_crawlers": true,
      "allowed_countries": [],
      "blocked_countries": [],
      "rate_limit_enabled": true,
      "rate_limit_requests": 10,
      "rate_limit_window": 60
    }';
  END IF;
END $$;

-- Add detection_results to domain_access_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'domain_access_logs' AND column_name = 'detection_results'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN detection_results jsonb DEFAULT '{}';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_threats ENABLE ROW LEVEL SECURITY;

-- Policies for detection_rules
CREATE POLICY "Users can view own detection rules"
  ON detection_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = detection_rules.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own detection rules"
  ON detection_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = detection_rules.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own detection rules"
  ON detection_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = detection_rules.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = detection_rules.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own detection rules"
  ON detection_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM protected_domains
      WHERE protected_domains.id = detection_rules.domain_id
      AND protected_domains.user_id = auth.uid()
    )
  );

-- Policies for known_threats (read-only for authenticated users)
CREATE POLICY "Authenticated users can view known threats"
  ON known_threats FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_detection_rules_domain ON detection_rules(domain_id);
CREATE INDEX IF NOT EXISTS idx_known_threats_type ON known_threats(threat_type);
CREATE INDEX IF NOT EXISTS idx_known_threats_identifier ON known_threats(identifier);

-- Insert some known threats (examples)
INSERT INTO known_threats (threat_type, identifier, severity, metadata) VALUES
  ('bot', 'googlebot', 'low', '{"description": "Google Search Bot"}'),
  ('bot', 'bingbot', 'low', '{"description": "Bing Search Bot"}'),
  ('crawler', 'semrush', 'medium', '{"description": "SEMrush Crawler"}'),
  ('crawler', 'ahrefs', 'medium', '{"description": "Ahrefs Crawler"}'),
  ('datacenter', 'asn:16276', 'high', '{"description": "OVH Datacenter", "provider": "OVH"}'),
  ('datacenter', 'asn:14061', 'high', '{"description": "DigitalOcean", "provider": "DigitalOcean"}'),
  ('vpn', 'asn:8100', 'high', '{"description": "QuadraNet VPN/Proxy"}')
ON CONFLICT DO NOTHING;