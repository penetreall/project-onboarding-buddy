import {
  validateClickId,
  checkClickIdReuse,
  recordClickIdObservation,
} from "./click-id-validator.ts";

export interface DetectionConfig {
  block_vpn: boolean;
  block_datacenter: boolean;
  block_proxy: boolean;
  block_bots: boolean;
  block_crawlers: boolean;
  allowed_countries: string[];
  blocked_countries: string[];
  rate_limit_enabled: boolean;
  rate_limit_requests: number;
  rate_limit_window: number;
  supabase_url: string;
  supabase_key: string;
}

export interface ValidationData {
  ip: string;
  user_agent: string;
  headers: Record<string, string>;
  country: string;
  params: URLSearchParams;
  domain_id: string;
}

export interface DetectionResult {
  layer: string;
  passed: boolean;
  reason?: string;
  details?: any;
}

export class DetectionEngine {
  private config: DetectionConfig;
  private requestCounts: Map<string, { count: number; timestamp: number }> = new Map();

  constructor(config: DetectionConfig) {
    this.config = config;
  }

  async validate(data: ValidationData): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];

    // LAYER 0: Click-ID First Principle (ABSOLUTE FILTER)
    // NO valid click-id = NO economic value = NEVER go to REAL
    const clickIdResult = await this.checkClickId(data);
    results.push(clickIdResult);

    // If click-id validation fails, STOP immediately
    // This is NON-NEGOTIABLE - without valid click-id, no other checks matter
    if (!clickIdResult.passed) {
      return results;
    }

    const ipValidation = this.checkIPValidity(data);
    if (!ipValidation.passed) {
      results.push(ipValidation);
      return results;
    }

    const geoResult = await this.checkGeoBlocking(data);
    results.push(geoResult);

    if (!geoResult.passed) {
      return results;
    }

    results.push(await this.checkBots(data));
    results.push(await this.checkDatacenter(data));
    results.push(await this.checkVPN(data));
    results.push(await this.checkProxy(data));
    results.push(await this.checkHeaderFingerprint(data));

    return results;
  }

  /**
   * CRITICAL: Click-ID First Principle
   *
   * Philosophy Change:
   * - OLD: Let humans pass
   * - NEW: Let VALID ECONOMIC CLICKS pass
   *
   * UTMs are trivial to forge. Click-IDs represent actual ad network clicks.
   * Without gclid/fbclid/ttclid/click_id, traffic has NO economic value.
   *
   * This check happens BEFORE all others. It's the primary filter.
   */
  private async checkClickId(data: ValidationData): Promise<DetectionResult> {
    const headers = new Headers();
    Object.keys(data.headers).forEach((key) => {
      headers.set(key, data.headers[key]);
    });

    // Validate click-id presence, format, entropy
    const validation = await validateClickId(
      data.params,
      headers,
      this.config.supabase_url,
      this.config.supabase_key
    );

    // Record observation for learning
    if (validation.hasClickId && validation.clickId && validation.network) {
      await recordClickIdObservation(
        data.domain_id,
        validation.clickId,
        validation.network,
        data.ip,
        data.user_agent,
        headers.get("referer") || headers.get("referrer"),
        validation.isValid,
        validation.validationErrors,
        validation.entropy,
        this.config.supabase_url,
        this.config.supabase_key
      );

      // Check for click-id reuse
      const reuseCheck = await checkClickIdReuse(
        validation.clickId,
        validation.network,
        data.domain_id,
        data.ip,
        this.config.supabase_url,
        this.config.supabase_key
      );

      if (reuseCheck.isReused && reuseCheck.hitCount > 1) {
        return {
          layer: "Click-ID Validation (ECONOMIC FILTER)",
          passed: false,
          reason: `Click-ID reused ${reuseCheck.hitCount} times - recycled click`,
          details: {
            network: validation.network,
            first_seen: reuseCheck.firstSeen,
            hit_count: reuseCheck.hitCount,
          },
        };
      }
    }

    if (!validation.hasClickId) {
      return {
        layer: "Click-ID Validation (ECONOMIC FILTER)",
        passed: false,
        reason: "No click-id found - no economic value",
        details: {
          checked_params: ["gclid", "fbclid", "ttclid", "click_id", "msclkid"],
          utm_source: data.params.get("utm_source"),
          utm_medium: data.params.get("utm_medium"),
          note: "UTMs alone are NOT economic signals",
        },
      };
    }

    if (!validation.isValid) {
      return {
        layer: "Click-ID Validation (ECONOMIC FILTER)",
        passed: false,
        reason: `Invalid click-id: ${validation.validationErrors.join(", ")}`,
        details: {
          network: validation.network,
          click_id_length: validation.clickId?.length,
          entropy: validation.entropy.toFixed(2),
          referer_match: validation.refererMatch,
          errors: validation.validationErrors,
        },
      };
    }

    return {
      layer: "Click-ID Validation (ECONOMIC FILTER)",
      passed: true,
      details: {
        network: validation.network,
        entropy: validation.entropy.toFixed(2),
        referer_match: validation.refererMatch,
        economic_value: true,
      },
    };
  }

  private checkIPValidity(data: ValidationData): DetectionResult {
    const ip = data.ip;

    if (!ip || ip === 'unknown' || ip === '') {
      return {
        layer: "IP Validation",
        passed: false,
        reason: "IP address unknown or missing",
        details: { ip }
      };
    }

    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return {
        layer: "IP Validation",
        passed: false,
        reason: "Localhost IP detected",
        details: { ip }
      };
    }

    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') || ip.startsWith('172.21.') || ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') || ip.startsWith('172.24.') || ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') || ip.startsWith('172.27.') || ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) {
      return {
        layer: "IP Validation",
        passed: false,
        reason: "Private IP address detected",
        details: { ip }
      };
    }

    return { layer: "IP Validation", passed: true };
  }

  private async checkBots(data: ValidationData): Promise<DetectionResult> {
    if (!this.config.block_bots) {
      return { layer: "Bot Detection", passed: true };
    }

    const botPatterns = [
      /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
      /googlebot/i, /bingbot/i, /yandex/i, /baiduspider/i,
      /facebookexternalhit/i, /twitterbot/i, /whatsapp/i,
      /telegram/i, /slack/i, /discord/i, /curl/i, /wget/i,
      /python/i, /java/i, /okhttp/i, /go-http/i, /axios/i,
      /node-fetch/i, /scrapy/i, /phantom/i, /headless/i
    ];

    const ua = data.user_agent.toLowerCase();
    for (const pattern of botPatterns) {
      if (pattern.test(ua)) {
        return {
          layer: "Bot Detection",
          passed: false,
          reason: "Bot user-agent detected",
          details: { pattern: pattern.source }
        };
      }
    }

    return { layer: "Bot Detection", passed: true };
  }

  private async checkDatacenter(data: ValidationData): Promise<DetectionResult> {
    if (!this.config.block_datacenter) {
      return { layer: "Datacenter Detection", passed: true };
    }

    const datacenterPatterns = [
      /amazon/i, /aws/i, /google cloud/i, /azure/i,
      /digitalocean/i, /linode/i, /vultr/i, /ovh/i,
      /hetzner/i, /contabo/i
    ];

    const headers = Object.values(data.headers).join(' ').toLowerCase();
    for (const pattern of datacenterPatterns) {
      if (pattern.test(headers)) {
        return {
          layer: "Datacenter Detection",
          passed: false,
          reason: "Datacenter IP detected",
          details: { pattern: pattern.source }
        };
      }
    }

    return { layer: "Datacenter Detection", passed: true };
  }

  private async checkVPN(data: ValidationData): Promise<DetectionResult> {
    if (!this.config.block_vpn) {
      return { layer: "VPN Detection", passed: true };
    }

    const vpnIndicators = [
      /vpn/i, /proxy/i, /tunnel/i, /nordvpn/i, /expressvpn/i,
      /surfshark/i, /protonvpn/i, /mullvad/i
    ];

    const combined = `${data.user_agent} ${Object.values(data.headers).join(' ')}`.toLowerCase();
    for (const indicator of vpnIndicators) {
      if (indicator.test(combined)) {
        return {
          layer: "VPN Detection",
          passed: false,
          reason: "VPN detected",
          details: { indicator: indicator.source }
        };
      }
    }

    return { layer: "VPN Detection", passed: true };
  }

  private async checkProxy(data: ValidationData): Promise<DetectionResult> {
    if (!this.config.block_proxy) {
      return { layer: "Proxy Detection", passed: true };
    }

    const proxyHeaders = [
      'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto',
      'X-Real-IP', 'X-Proxy-ID', 'Via', 'Forwarded'
    ];

    for (const header of proxyHeaders) {
      const headerKey = header.toUpperCase().replace(/-/g, '-');
      if (data.headers[headerKey] && data.headers[headerKey].includes(',')) {
        return {
          layer: "Proxy Detection",
          passed: false,
          reason: "Proxy headers detected",
          details: { header: headerKey }
        };
      }
    }

    return { layer: "Proxy Detection", passed: true };
  }

  private async checkHeaderFingerprint(data: ValidationData): Promise<DetectionResult> {
    const hasUserAgent = data.headers['USER-AGENT'] || data.headers['USER_AGENT'] || data.user_agent;

    if (!hasUserAgent || hasUserAgent === 'unknown') {
      return {
        layer: "Header Fingerprinting",
        passed: false,
        reason: "Missing User-Agent",
        details: { missing: ['USER-AGENT'] }
      };
    }

    const suspiciousUAPatterns = [
      /^curl\//i, /^wget\//i, /python-requests/i, /^java\//i, /okhttp/i,
      /go-http/i, /^$/
    ];

    for (const pattern of suspiciousUAPatterns) {
      if (pattern.test(hasUserAgent)) {
        return {
          layer: "Header Fingerprinting",
          passed: false,
          reason: "Suspicious User-Agent pattern",
          details: { pattern: pattern.source, ua: hasUserAgent }
        };
      }
    }

    return { layer: "Header Fingerprinting", passed: true };
  }

  private async checkGeoBlocking(data: ValidationData): Promise<DetectionResult> {
    const country = data.country;

    if (!country || country === 'UNKNOWN' || country === 'unknown' || country === '') {
      return {
        layer: "Geo-Blocking",
        passed: false,
        reason: "Country unknown - fail-closed security",
        details: { country }
      };
    }

    if (this.config.allowed_countries.length > 0) {
      if (!this.config.allowed_countries.includes(country)) {
        return {
          layer: "Geo-Blocking",
          passed: false,
          reason: "Country not in allowed list",
          details: { country, allowed: this.config.allowed_countries }
        };
      }
    }

    if (this.config.blocked_countries.length > 0) {
      if (this.config.blocked_countries.includes(country)) {
        return {
          layer: "Geo-Blocking",
          passed: false,
          reason: "Country is blocked",
          details: { country }
        };
      }
    }

    return { layer: "Geo-Blocking", passed: true };
  }

  getAllResults(results: DetectionResult[]) {
    const failedLayers = results.filter(r => !r.passed);
    const passed = failedLayers.length === 0;

    return {
      passed,
      failedLayers: failedLayers.map(r => r.layer),
      allResults: results
    };
  }
}