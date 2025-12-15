import { createClient } from "npm:@supabase/supabase-js@2";

export interface ContradictionContext {
  ip: string;
  userAgent: string;
  headers: Record<string, string>;
  platformType: string;
  country: string;
  requestPath: string;
  queryParams: Record<string, string>;
  timing: {
    requestStart: number;
    serverReceived: number;
  };
  hasValidGclid?: boolean;
}

export interface ContradictionResult {
  hasContradictions: boolean;
  signals: ContradictionSignal[];
  humanLikelihood: number;
  botLikelihood: number;
}

interface ContradictionSignal {
  type: string;
  expected: string;
  actual: string;
  weight: number;
  isHumanIndicator: boolean;
}

export class ContradictionDetector {
  private signals: ContradictionSignal[] = [];

  analyze(context: ContradictionContext): ContradictionResult {
    this.signals = [];

    this.checkPlatformUserAgentCoherence(context);
    this.checkLanguageGeoCoherence(context);
    this.checkHeaderOrderAnomaly(context);
    this.checkTimingAnomaly(context);
    this.checkBrowserFingerprint(context);
    this.checkNavigationPattern(context);
    this.checkAcceptHeaderCoherence(context);

    // 🔥 GOOGLE ADS MODE: Soften contradiction weights
    // Valid gclid = economic value proven
    // Mild contradictions should not block (e.g., language mismatch on iOS)
    if (context.hasValidGclid) {
      // Reduce weight of all bot signals by 60%
      // Contradictions become INFORMATIONAL, not BLOCKING
      this.signals = this.signals.map(signal => {
        if (!signal.isHumanIndicator) {
          return {
            ...signal,
            weight: signal.weight * 0.4, // 60% reduction
          };
        }
        return signal;
      });
    }

    const humanSignals = this.signals.filter(s => s.isHumanIndicator);
    const botSignals = this.signals.filter(s => !s.isHumanIndicator);

    const humanScore = humanSignals.reduce((sum, s) => sum + s.weight, 0);
    const botScore = botSignals.reduce((sum, s) => sum + s.weight, 0);

    const totalWeight = humanScore + botScore;
    const humanLikelihood = totalWeight > 0 ? humanScore / totalWeight : 0.5;
    const botLikelihood = totalWeight > 0 ? botScore / totalWeight : 0.5;

    // With valid gclid, only MAJOR contradictions (bot likelihood > 0.8) matter
    const hasSignificantContradictions = context.hasValidGclid
      ? (botSignals.length > 0 && botLikelihood > 0.8)
      : (botSignals.length > 0);

    return {
      hasContradictions: hasSignificantContradictions,
      signals: this.signals,
      humanLikelihood: Math.min(humanLikelihood, 1.0),
      botLikelihood: Math.min(botLikelihood, 1.0),
    };
  }

  private checkPlatformUserAgentCoherence(context: ContradictionContext): void {
    const ua = context.userAgent.toLowerCase();
    const platform = context.platformType;

    if (platform === 'desktop') {
      if (/android|iphone|mobile/i.test(ua) && !/tablet|ipad/i.test(ua)) {
        this.signals.push({
          type: 'platform_ua_mismatch',
          expected: 'Desktop UA for desktop platform',
          actual: 'Mobile UA detected',
          weight: 0.7,
          isHumanIndicator: false,
        });
      }

      if (/linux/i.test(ua) && /windows nt/i.test(ua)) {
        this.signals.push({
          type: 'ua_self_contradiction',
          expected: 'Single OS in UA',
          actual: 'Multiple OS indicators',
          weight: 0.9,
          isHumanIndicator: false,
        });
      }
    }

    if (platform === 'mobile') {
      if (/windows nt|macintosh|linux x86_64/i.test(ua) && !/mobile/i.test(ua)) {
        this.signals.push({
          type: 'platform_ua_mismatch',
          expected: 'Mobile UA for mobile platform',
          actual: 'Desktop UA detected',
          weight: 0.6,
          isHumanIndicator: false,
        });
      }
    }

    const chromeMatch = ua.match(/chrome\/(\d+)/i);
    const safariMatch = ua.match(/safari\/(\d+)/i);
    if (chromeMatch && safariMatch) {
      const chromeVer = parseInt(chromeMatch[1]);
      if (chromeVer > 90 && /safari\/(\d{3})/i.test(ua)) {
        this.signals.push({
          type: 'ua_version_natural',
          expected: 'Consistent browser versioning',
          actual: 'Natural Chrome+Safari versioning pattern',
          weight: 0.3,
          isHumanIndicator: true,
        });
      }
    }
  }

  private checkLanguageGeoCoherence(context: ContradictionContext): void {
    const acceptLang = context.headers['ACCEPT-LANGUAGE'] ||
                       context.headers['Accept-Language'] ||
                       context.headers['accept-language'] || '';
    const country = context.country;

    const langCountryMap: Record<string, string[]> = {
      'BR': ['pt', 'pt-br', 'portuguese'],
      'US': ['en', 'en-us', 'english'],
      'ES': ['es', 'es-es', 'spanish'],
      'FR': ['fr', 'fr-fr', 'french'],
      'DE': ['de', 'de-de', 'german'],
      'IT': ['it', 'it-it', 'italian'],
      'JP': ['ja', 'jp', 'japanese'],
      'CN': ['zh', 'cn', 'chinese'],
      'RU': ['ru', 'russian'],
      'PT': ['pt', 'pt-pt', 'portuguese'],
      'MX': ['es', 'es-mx', 'spanish'],
      'AR': ['es', 'es-ar', 'spanish'],
    };

    const expectedLangs = langCountryMap[country] || [];

    if (expectedLangs.length > 0 && acceptLang) {
      const langLower = acceptLang.toLowerCase();
      const hasExpectedLang = expectedLangs.some(lang => langLower.includes(lang));

      if (!hasExpectedLang) {
        this.signals.push({
          type: 'lang_geo_mismatch',
          expected: `Language matching ${country}: ${expectedLangs.join(', ')}`,
          actual: `Accept-Language: ${acceptLang.substring(0, 50)}`,
          weight: 0.4,
          isHumanIndicator: false,
        });
      } else {
        this.signals.push({
          type: 'lang_geo_match',
          expected: 'Language matches geo',
          actual: 'Consistent language/location',
          weight: 0.2,
          isHumanIndicator: true,
        });
      }
    }

    if (acceptLang && acceptLang.includes(',')) {
      const langs = acceptLang.split(',');
      if (langs.length >= 2 && langs.length <= 5) {
        this.signals.push({
          type: 'multi_lang_natural',
          expected: 'Multiple language preferences',
          actual: `${langs.length} languages configured`,
          weight: 0.25,
          isHumanIndicator: true,
        });
      }
    }
  }

  private checkHeaderOrderAnomaly(context: ContradictionContext): void {
    const headerKeys = Object.keys(context.headers);

    const typicalBrowserOrder = [
      'HOST', 'CONNECTION', 'UPGRADE-INSECURE-REQUESTS',
      'USER-AGENT', 'ACCEPT', 'ACCEPT-ENCODING', 'ACCEPT-LANGUAGE'
    ];

    let matchScore = 0;
    let checkedHeaders = 0;

    for (let i = 0; i < headerKeys.length && i < typicalBrowserOrder.length; i++) {
      const normalizedKey = headerKeys[i].toUpperCase().replace(/_/g, '-');
      if (typicalBrowserOrder.includes(normalizedKey)) {
        checkedHeaders++;
        const expectedIndex = typicalBrowserOrder.indexOf(normalizedKey);
        if (Math.abs(expectedIndex - i) <= 2) {
          matchScore++;
        }
      }
    }

    if (checkedHeaders > 0) {
      const orderScore = matchScore / checkedHeaders;

      if (orderScore > 0.8) {
        this.signals.push({
          type: 'header_order_typical',
          expected: 'Typical browser header order',
          actual: `Order match: ${(orderScore * 100).toFixed(0)}%`,
          weight: 0.2,
          isHumanIndicator: true,
        });
      } else if (orderScore < 0.3) {
        this.signals.push({
          type: 'header_order_atypical',
          expected: 'Typical browser header order',
          actual: `Order match: ${(orderScore * 100).toFixed(0)}%`,
          weight: 0.5,
          isHumanIndicator: false,
        });
      }
    }

    const casePatterns = {
      upper: headerKeys.filter(k => k === k.toUpperCase()).length,
      lower: headerKeys.filter(k => k === k.toLowerCase()).length,
      title: headerKeys.filter(k => /^[A-Z][a-z]+(-[A-Z][a-z]+)*$/.test(k)).length,
    };

    const maxPattern = Math.max(casePatterns.upper, casePatterns.lower, casePatterns.title);
    const consistency = maxPattern / headerKeys.length;

    if (consistency < 0.7) {
      this.signals.push({
        type: 'header_case_inconsistent',
        expected: 'Consistent header casing',
        actual: `Mixed casing pattern (${(consistency * 100).toFixed(0)}% consistent)`,
        weight: 0.3,
        isHumanIndicator: false,
      });
    }
  }

  private checkTimingAnomaly(context: ContradictionContext): void {
    const processingTime = context.timing.serverReceived - context.timing.requestStart;

    if (processingTime < 50) {
      this.signals.push({
        type: 'timing_too_fast',
        expected: 'Human-like request timing (>100ms)',
        actual: `Request processed in ${processingTime}ms`,
        weight: 0.6,
        isHumanIndicator: false,
      });
    } else if (processingTime >= 200 && processingTime <= 2000) {
      this.signals.push({
        type: 'timing_natural',
        expected: 'Natural timing range',
        actual: `Request took ${processingTime}ms`,
        weight: 0.15,
        isHumanIndicator: true,
      });
    }
  }

  private checkBrowserFingerprint(context: ContradictionContext): void {
    const ua = context.userAgent.toLowerCase();
    const headers = context.headers;

    const isChrome = /chrome/i.test(ua) && !/edg|opr/i.test(ua);
    const isFirefox = /firefox/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);

    if (isChrome) {
      const hasSecChUa = headers['SEC-CH-UA'] || headers['sec-ch-ua'];
      if (!hasSecChUa) {
        const chromeMatch = ua.match(/chrome\/(\d+)/i);
        if (chromeMatch && parseInt(chromeMatch[1]) >= 90) {
          this.signals.push({
            type: 'missing_sec_ch_ua',
            expected: 'Sec-CH-UA header for modern Chrome',
            actual: 'Header missing',
            weight: 0.4,
            isHumanIndicator: false,
          });
        }
      }
    }

    const acceptEncoding = headers['ACCEPT-ENCODING'] || headers['Accept-Encoding'] || '';
    if (isChrome && acceptEncoding && !acceptEncoding.includes('br')) {
      this.signals.push({
        type: 'missing_brotli',
        expected: 'Brotli support in modern Chrome',
        actual: `Accept-Encoding: ${acceptEncoding}`,
        weight: 0.3,
        isHumanIndicator: false,
      });
    }

    if (isFirefox) {
      const dnt = headers['DNT'] || headers['dnt'];
      if (dnt === '1') {
        this.signals.push({
          type: 'firefox_dnt',
          expected: 'DNT is a privacy-conscious setting',
          actual: 'DNT enabled',
          weight: 0.2,
          isHumanIndicator: true,
        });
      }
    }
  }

  private checkNavigationPattern(context: ContradictionContext): void {
    const referer = context.headers['REFERER'] || context.headers['Referer'] || '';
    const path = context.requestPath;

    if (!referer && path !== '/' && !path.includes('index')) {
      this.signals.push({
        type: 'deep_direct_access',
        expected: 'Referer for deep page access',
        actual: `Direct access to ${path} without referer`,
        weight: 0.35,
        isHumanIndicator: false,
      });
    }

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererHost = refererUrl.hostname;
        const hostHeader = context.headers['HOST'] || context.headers['host'] || '';

        if (refererHost === hostHeader || refererHost.endsWith('.' + hostHeader)) {
          this.signals.push({
            type: 'internal_referer',
            expected: 'Internal navigation',
            actual: 'Navigating from same site',
            weight: 0.25,
            isHumanIndicator: true,
          });
        }
      } catch {
      }
    }
  }

  private checkAcceptHeaderCoherence(context: ContradictionContext): void {
    const accept = context.headers['ACCEPT'] || context.headers['Accept'] || '';
    const ua = context.userAgent.toLowerCase();

    if (accept) {
      if (accept === '*/*') {
        this.signals.push({
          type: 'generic_accept',
          expected: 'Specific Accept header for browser',
          actual: 'Generic */* accept',
          weight: 0.4,
          isHumanIndicator: false,
        });
      }

      if (accept.includes('text/html') && accept.includes('application/xhtml+xml')) {
        this.signals.push({
          type: 'browser_accept',
          expected: 'Browser-like Accept header',
          actual: 'Standard browser Accept pattern',
          weight: 0.15,
          isHumanIndicator: true,
        });
      }
    }

    const connection = context.headers['CONNECTION'] || context.headers['Connection'] || '';
    if (connection.toLowerCase() === 'keep-alive') {
      this.signals.push({
        type: 'keepalive_connection',
        expected: 'Persistent connection',
        actual: 'Keep-alive enabled',
        weight: 0.1,
        isHumanIndicator: true,
      });
    }
  }
}

export async function saveContradictionSignals(
  supabaseUrl: string,
  supabaseServiceKey: string,
  domainId: string,
  context: ContradictionContext,
  result: ContradictionResult
): Promise<void> {
  if (result.signals.length === 0) return;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const significantSignals = result.signals.filter(s => s.weight >= 0.3);

    for (const signal of significantSignals) {
      await supabase.from('contradiction_signals').insert({
        domain_id: domainId,
        ip: context.ip,
        signal_type: signal.type,
        signal_value: signal.actual,
        expected_behavior: signal.expected,
        actual_behavior: signal.actual,
        was_human_response: signal.isHumanIndicator,
        confidence: signal.weight,
      });
    }
  } catch (error) {
    console.error('[Contradiction] Failed to save signals:', error);
  }
}
