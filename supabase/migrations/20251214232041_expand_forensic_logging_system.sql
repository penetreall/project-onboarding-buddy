/*
  # Expand Forensic Logging System
  
  1. Changes
    - Expand domain_access_logs to capture COMPLETE forensic data
    - Add IP metadata (type, ASN, ISP, datacenter, proxy)
    - Add platform detection details (type, confidence, reasoning)
    - Add click/ads validation complete data
    - Add detection layer-by-layer results
    - Add technical context (versions, request_id)
    - Add risk scoring breakdown
  
  2. Security
    - Maintains existing RLS policies
    - No changes to access control
  
  3. Purpose
    - Enable professional-grade observability
    - Support forensic analysis and debugging
    - Match industry standards (Cloudflare, Akamai, Kasada)
*/

-- Add comprehensive forensic columns
DO $$ 
BEGIN
  -- IP Metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'ip_type'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN ip_type text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'country_source'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN country_source text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'asn'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN asn text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'isp'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN isp text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'is_datacenter'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN is_datacenter boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'is_proxy'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN is_proxy boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'is_vpn'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN is_vpn boolean DEFAULT false;
  END IF;
  
  -- Platform Detection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'platform_type'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN platform_type text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'platform_confidence'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN platform_confidence numeric(5,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'platform_reasoning'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN platform_reasoning text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'accept_language'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN accept_language text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'referer_url'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN referer_url text;
  END IF;
  
  -- Click/Ads Validation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'ad_network'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN ad_network text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'gclid_present'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN gclid_present boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'gclid_valid'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN gclid_valid boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'gclid_length'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN gclid_length integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'gclid_entropy'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN gclid_entropy numeric(5,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'gclid_reused'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN gclid_reused boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'utm_params'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN utm_params jsonb;
  END IF;
  
  -- Detection Layers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'detection_layers'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN detection_layers jsonb;
  END IF;
  
  -- Risk Scoring
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'risk_score_breakdown'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN risk_score_breakdown jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'final_risk_score'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN final_risk_score numeric(5,2);
  END IF;
  
  -- Decision Context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'decision_gate'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN decision_gate text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'primary_reason'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN primary_reason text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'secondary_reasons'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN secondary_reasons text[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'overrides_applied'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN overrides_applied text[];
  END IF;
  
  -- Technical Context
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'edge_version'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN edge_version text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'detection_pipeline_version'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN detection_pipeline_version text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'php_template_version'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN php_template_version text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN request_id text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'processing_time_ms'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN processing_time_ms integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'fatal_error'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN fatal_error boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domain_access_logs' AND column_name = 'fatal_error_stage'
  ) THEN
    ALTER TABLE domain_access_logs ADD COLUMN fatal_error_stage text;
  END IF;
END $$;

-- Create index for forensic queries
CREATE INDEX IF NOT EXISTS idx_logs_forensic_search 
ON domain_access_logs(ip, country, is_datacenter, is_proxy, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_click_id_analysis 
ON domain_access_logs(gclid_present, gclid_valid, ad_network, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_platform_analysis 
ON domain_access_logs(platform_type, platform_confidence, created_at DESC);

COMMENT ON COLUMN domain_access_logs.ip_type IS 'IPv4 or IPv6';
COMMENT ON COLUMN domain_access_logs.country_source IS 'CF-IPCOUNTRY | GEOIP | FALLBACK | NONE';
COMMENT ON COLUMN domain_access_logs.detection_layers IS 'Layer-by-layer detection results';
COMMENT ON COLUMN domain_access_logs.decision_gate IS 'deterministic | risk_based';
COMMENT ON COLUMN domain_access_logs.fatal_error IS 'True if blocked early in pipeline';
COMMENT ON COLUMN domain_access_logs.fatal_error_stage IS 'Stage where fatal error occurred';