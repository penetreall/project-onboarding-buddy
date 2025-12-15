/**
 * Click-ID Validator - Economic Click Validation
 *
 * Philosophy: UTMs are trivial to forge. Click-IDs represent economic value.
 * Without valid click-id from ad network, traffic has NO economic value.
 */

interface ClickIdValidationResult {
  hasClickId: boolean;
  network: string | null;
  clickId: string | null;
  isValid: boolean;
  validationErrors: string[];
  entropy: number;
  timingCoherent: boolean;
  refererMatch: boolean;
}

interface NetworkRule {
  network: string;
  click_id_param: string;
  min_length: number;
  max_length: number;
  min_entropy: number;
  requires_referer: boolean;
  referer_pattern: string | null;
  priority: number;
}

/**
 * Calculate Shannon entropy of a string
 * Low entropy = repetitive/predictable = likely forged
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;

  const frequencies: { [key: string]: number } = {};
  for (let i = 0; i < len; i++) {
    frequencies[str[i]] = (frequencies[str[i]] || 0) + 1;
  }

  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Extract click-id from request params
 */
function extractClickId(
  params: URLSearchParams,
  rules: NetworkRule[]
): { network: string; clickId: string; rule: NetworkRule } | null {
  // Sort by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const clickId = params.get(rule.click_id_param);
    if (clickId) {
      return { network: rule.network, clickId, rule };
    }
  }

  return null;
}

/**
 * Validate referer matches expected ad network
 */
function validateReferer(
  referer: string | null,
  refererPattern: string | null
): boolean {
  if (!refererPattern) return true; // Not required
  if (!referer) return false;

  try {
    const regex = new RegExp(refererPattern, 'i');
    return regex.test(referer);
  } catch {
    return false;
  }
}

/**
 * CRITICAL: Click-ID First Principle
 *
 * NO valid click-id = NO economic value = NEVER go to REAL
 *
 * This is the PRIMARY filter. All other checks are secondary.
 */
export async function validateClickId(
  params: URLSearchParams,
  headers: Headers,
  supabaseUrl: string,
  supabaseKey: string
): Promise<ClickIdValidationResult> {
  const result: ClickIdValidationResult = {
    hasClickId: false,
    network: null,
    clickId: null,
    isValid: false,
    validationErrors: [],
    entropy: 0,
    timingCoherent: true,
    refererMatch: false,
  };

  // Fetch validation rules from database
  const rulesResponse = await fetch(
    `${supabaseUrl}/rest/v1/click_id_validation_rules?enabled=eq.true&select=*`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!rulesResponse.ok) {
    result.validationErrors.push('failed_to_load_rules');
    return result;
  }

  const rules: NetworkRule[] = await rulesResponse.json();

  // Extract click-id from params
  const extracted = extractClickId(params, rules);

  if (!extracted) {
    // CRITICAL: No click-id found
    result.validationErrors.push('no_click_id');
    return result;
  }

  result.hasClickId = true;
  result.network = extracted.network;
  result.clickId = extracted.clickId;

  const { clickId, rule } = extracted;

  // Validate length
  if (clickId.length < rule.min_length) {
    result.validationErrors.push('click_id_too_short');
  }

  if (clickId.length > rule.max_length) {
    result.validationErrors.push('click_id_too_long');
  }

  // Validate entropy
  const entropy = calculateEntropy(clickId);
  result.entropy = entropy;

  if (entropy < rule.min_entropy) {
    result.validationErrors.push('low_entropy');
  }

  // Validate referer
  // NOTE: Google Ads (iOS/Safari/WebView) often doesn't send referer
  // This is NORMAL and LEGITIMATE behavior - gclid validity is the primary signal
  const referer = headers.get('referer') || headers.get('referrer');
  result.refererMatch = validateReferer(referer, rule.referer_pattern);

  // Only flag as error if referer is REQUIRED and missing/mismatched
  // For Google Ads, referer is NOT required (iOS/Safari reality)
  if (rule.requires_referer && !result.refererMatch) {
    result.validationErrors.push('referer_mismatch');
  }

  // Check for suspicious patterns
  if (/^[a-z]+$/.test(clickId) || /^[0-9]+$/.test(clickId)) {
    result.validationErrors.push('suspicious_pattern');
  }

  // Check for repetition (e.g., "aaaaaaaaaaa")
  if (/(.)\1{5,}/.test(clickId)) {
    result.validationErrors.push('excessive_repetition');
  }

  // Final validation
  result.isValid = result.validationErrors.length === 0;

  return result;
}

/**
 * Check if click-id has been seen before (reuse detection)
 */
export async function checkClickIdReuse(
  clickId: string,
  network: string,
  domainId: string,
  ip: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ isReused: boolean; hitCount: number; firstSeen: string | null }> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/click_id_observations?click_id=eq.${encodeURIComponent(clickId)}&domain_id=eq.${domainId}&select=hit_count,first_seen,last_seen`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    return { isReused: false, hitCount: 0, firstSeen: null };
  }

  const observations = await response.json();

  if (observations.length === 0) {
    return { isReused: false, hitCount: 0, firstSeen: null };
  }

  const observation = observations[0];
  return {
    isReused: true,
    hitCount: observation.hit_count,
    firstSeen: observation.first_seen,
  };
}

/**
 * Record click-id observation in database
 */
export async function recordClickIdObservation(
  domainId: string,
  clickId: string,
  network: string,
  ip: string,
  userAgent: string,
  referer: string | null,
  isValid: boolean,
  validationErrors: string[],
  entropy: number,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  // Check if already exists
  const checkResponse = await fetch(
    `${supabaseUrl}/rest/v1/click_id_observations?click_id=eq.${encodeURIComponent(clickId)}&domain_id=eq.${domainId}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (checkResponse.ok) {
    const existing = await checkResponse.json();

    if (existing.length > 0) {
      // Update existing observation
      await fetch(
        `${supabaseUrl}/rest/v1/click_id_observations?id=eq.${existing[0].id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            last_seen: new Date().toISOString(),
            hit_count: existing[0].hit_count + 1,
          }),
        }
      );
      return;
    }
  }

  // Insert new observation
  await fetch(`${supabaseUrl}/rest/v1/click_id_observations`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      domain_id: domainId,
      click_id: clickId,
      network,
      ip,
      user_agent: userAgent,
      referer,
      is_valid: isValid,
      validation_errors: validationErrors,
      entropy_score: entropy,
      timing_coherent: true,
    }),
  });
}
