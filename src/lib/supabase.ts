import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProtectedDomain {
  id: string;
  user_id: string;
  public_domain: string;
  protected_domain: string;
  sensitivity_level: 'low' | 'medium' | 'high' | 'maximum';
  status: 'active' | 'paused' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface TrafficAnalytic {
  id: string;
  domain_id: string;
  visitor_fingerprint: string;
  trust_score: number;
  request_count: number;
  interaction_metrics: Record<string, any>;
  classification: 'legitimate' | 'suspicious' | 'bot' | 'unknown';
  timestamp: string;
}

export interface SecurityLog {
  id: string;
  domain_id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  timestamp: string;
}
