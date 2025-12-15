import { createClient } from "npm:@supabase/supabase-js@2";

interface BehavioralFeatures {
  hour_of_day: number;
  day_of_week: number;
  has_user_agent: boolean;
  has_referer: boolean;
  has_accept_language: boolean;
  header_count: number;
  is_direct_access: boolean;
  url_depth: number;
  has_query_params: boolean;
  query_param_count: number;
  bypass_param_present: boolean;
  bypass_param_valid: boolean;
  is_mobile: boolean;
  platform_category: string;
  header_order_entropy: number;
  header_case_consistency: boolean;
}

interface ValidationData {
  ip: string;
  user_agent: string;
  headers: Record<string, string>;
  country: string;
}

interface ValidationResult {
  passed: boolean;
  checks?: Array<{ name: string; passed: boolean }>;
  failedLayers?: string[];
}

function extractBehavioralFeatures(
  request: Request,
  validationData: ValidationData,
  bypassParam?: string
): BehavioralFeatures {
  const now = new Date();
  const url = new URL(request.url);
  const headers = validationData.headers;

  const headerKeys = Object.keys(headers);
  const hasUserAgent = !!validationData.user_agent && validationData.user_agent !== 'unknown';
  const hasReferer = !!headers['REFERER'] || !!headers['Referer'];
  const hasAcceptLanguage = !!headers['ACCEPT-LANGUAGE'] || !!headers['Accept-Language'];

  const urlDepth = url.pathname.split('/').filter(p => p.length > 0).length;
  const hasQueryParams = url.search.length > 0;
  const queryParams = new URLSearchParams(url.search);
  const queryParamCount = Array.from(queryParams.keys()).length;

  const bypassParamPresent = bypassParam ? url.search.includes(bypassParam) : false;

  const userAgent = validationData.user_agent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);

  let platformCategory = 'unknown';
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    platformCategory = 'bot';
  } else if (isMobile) {
    platformCategory = 'mobile';
  } else if (userAgent && userAgent !== 'unknown') {
    platformCategory = 'desktop';
  }

  const headerOrderEntropy = calculateHeaderOrderEntropy(headerKeys);

  const headerCaseConsistency = checkHeaderCaseConsistency(headerKeys);

  return {
    hour_of_day: now.getUTCHours(),
    day_of_week: now.getUTCDay(),
    has_user_agent: hasUserAgent,
    has_referer: hasReferer,
    has_accept_language: hasAcceptLanguage,
    header_count: headerKeys.length,
    is_direct_access: !hasReferer,
    url_depth: urlDepth,
    has_query_params: hasQueryParams,
    query_param_count: queryParamCount,
    bypass_param_present: bypassParamPresent,
    bypass_param_valid: false,
    is_mobile: isMobile,
    platform_category: platformCategory,
    header_order_entropy: headerOrderEntropy,
    header_case_consistency: headerCaseConsistency,
  };
}

function calculateHeaderOrderEntropy(headerKeys: string[]): number {
  if (headerKeys.length === 0) return 0;

  const positions = new Map<string, number>();
  const standardOrder = [
    'HOST', 'USER-AGENT', 'ACCEPT', 'ACCEPT-LANGUAGE',
    'ACCEPT-ENCODING', 'REFERER', 'CONNECTION'
  ];

  let matchCount = 0;
  headerKeys.forEach((key, index) => {
    const normalizedKey = key.toUpperCase();
    const expectedIndex = standardOrder.indexOf(normalizedKey);
    if (expectedIndex !== -1 && Math.abs(expectedIndex - index) <= 2) {
      matchCount++;
    }
  });

  return headerKeys.length > 0 ? matchCount / headerKeys.length : 0;
}

function checkHeaderCaseConsistency(headerKeys: string[]): boolean {
  if (headerKeys.length === 0) return true;

  const allUpperCase = headerKeys.every(k => k === k.toUpperCase());
  const allLowerCase = headerKeys.every(k => k === k.toLowerCase());
  const allTitleCase = headerKeys.every(k => {
    return k.split('-').every(part =>
      part.length > 0 && part[0] === part[0].toUpperCase()
    );
  });

  return allUpperCase || allLowerCase || allTitleCase;
}

async function generatePatternHash(features: BehavioralFeatures): Promise<string> {
  const normalized = {
    time_bucket: Math.floor(features.hour_of_day / 4),
    day_type: features.day_of_week < 5 ? 'weekday' : 'weekend',
    header_completeness: [
      features.has_user_agent,
      features.has_referer,
      features.has_accept_language
    ].filter(Boolean).length,
    navigation_depth: Math.min(features.url_depth, 5),
    bypass_status: `${features.bypass_param_present}_${features.bypass_param_valid}`,
    platform: features.platform_category,
    header_count_bucket: Math.min(Math.floor(features.header_count / 5), 5),
    is_direct: features.is_direct_access,
  };

  const dataString = JSON.stringify(normalized);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

function determineTrafficClassification(result: ValidationResult): string {
  if (result.passed) {
    return 'legitimate';
  }

  const failedLayers = result.failedLayers || [];
  const criticalFailures = failedLayers.filter(layer =>
    layer.toLowerCase().includes('bot') ||
    layer.toLowerCase().includes('datacenter') ||
    layer.toLowerCase().includes('vpn') ||
    layer.toLowerCase().includes('proxy')
  );

  if (criticalFailures.length > 0) {
    return 'blocked';
  }

  return 'suspicious';
}

async function upsertBehavioralPattern(
  supabaseUrl: string,
  supabaseServiceKey: string,
  patternHash: string,
  classification: string,
  features: BehavioralFeatures
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.rpc('upsert_behavioral_pattern', {
      p_pattern_hash: patternHash,
      p_classification: classification,
      p_features: features
    });

    if (error) {
      console.error('[Shadow Observer] Failed to upsert pattern:', error);
    }
  } catch (error) {
    console.error('[Shadow Observer] Unexpected error in upsert:', error);
  }
}

export async function observeBehavioralPattern(
  request: Request,
  validationResult: ValidationResult,
  validationData: ValidationData,
  supabaseUrl: string,
  supabaseServiceKey: string,
  bypassParam?: string
): Promise<void> {
  try {
    const features = extractBehavioralFeatures(request, validationData, bypassParam);

    const patternHash = await generatePatternHash(features);

    const classification = determineTrafficClassification(validationResult);

    await upsertBehavioralPattern(
      supabaseUrl,
      supabaseServiceKey,
      patternHash,
      classification,
      features
    );
  } catch (error) {
    console.error('[Shadow Observer] Pattern observation failed (silently):', error);
  }
}