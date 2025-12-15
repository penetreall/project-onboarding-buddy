import { createClient } from "npm:@supabase/supabase-js@2";

export interface RiskContext {
  ip: string;
  userAgent: string;
  headers: Record<string, string>;
  country: string;
  platformType: string;
  passedAllLayers: boolean;
  failedLayers: string[];
  requestTimestamp: number;
  navigationDepth: number;
  hasReferer: boolean;
  sessionData?: SessionContext;
  clickId?: ClickIdContext;
  isDatacenter?: boolean;
  isBotDetected?: boolean;
}

export interface ClickIdContext {
  hasClickId: boolean;
  isValid: boolean;
  network: string | null;
  entropy: number;
  refererMatch: boolean;
  validationErrors: string[];
}

export interface SessionContext {
  previousRequests?: number;
  avgTimeBetweenRequests?: number;
  pagesVisited?: string[];
  hasScrolled?: boolean;
  hasMouseMovement?: boolean;
  hasFocusBlur?: boolean;
  viewportChanges?: number;
}

export interface RiskAssessment {
  finalRisk: number;
  decision: 'real' | 'safe' | 'safe_observe' | 'human_no_value';
  coherenceScore: number;
  humanNoiseScore: number;
  perfectionPenalty: number;
  temporalVariance: number;
  clickIdScore: number;
  economicValue: boolean;
  factors: RiskFactors;
  reasoning: string[];
}

interface RiskFactors {
  platformTrust: number;
  headerCoherence: number;
  behaviorCoherence: number;
  timingNaturalness: number;
  navigationPattern: number;
}

interface PlatformProfile {
  baseTrustScore: number;
  requiresContext: boolean;
  directToRealAllowed: boolean;
  minHumanNoiseRequired: number;
  maxPerfectionAllowed: number;
  contextWeight: number;
}

const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  desktop: {
    baseTrustScore: 0.3,
    requiresContext: true,
    directToRealAllowed: false,
    minHumanNoiseRequired: 0.15,
    maxPerfectionAllowed: 0.7,
    contextWeight: 1.5,
  },
  mobile: {
    baseTrustScore: 0.6,
    requiresContext: false,
    directToRealAllowed: true,
    minHumanNoiseRequired: 0.05,
    maxPerfectionAllowed: 0.9,
    contextWeight: 0.8,
  },
  tablet: {
    baseTrustScore: 0.5,
    requiresContext: true,
    directToRealAllowed: false,
    minHumanNoiseRequired: 0.1,
    maxPerfectionAllowed: 0.8,
    contextWeight: 1.0,
  },
  unknown: {
    baseTrustScore: 0.2,
    requiresContext: true,
    directToRealAllowed: false,
    minHumanNoiseRequired: 0.2,
    maxPerfectionAllowed: 0.6,
    contextWeight: 2.0,
  },
};

export class RiskScoringEngine {
  private requestStartTime: number;

  constructor() {
    this.requestStartTime = Date.now();
  }

  async assess(context: RiskContext): Promise<RiskAssessment> {
    const reasoning: string[] = [];
    const profile = PLATFORM_PROFILES[context.platformType] || PLATFORM_PROFILES.unknown;

    reasoning.push(`Platform: ${context.platformType} (base trust: ${profile.baseTrustScore})`);

    // ═══════════════════════════════════════════════════════════
    // CRITICAL: Click-ID First Principle
    // ═══════════════════════════════════════════════════════════
    // Philosophy: UTMs are trivial to forge. Click-IDs = economic value.
    // NO valid click-id = NO economic value = NEVER 'real' decision
    //
    // This check happens FIRST and overrides ALL other factors.
    // ═══════════════════════════════════════════════════════════

    let clickIdScore = 0.0;
    let economicValue = false;

    if (!context.clickId || !context.clickId.hasClickId) {
      reasoning.push('═══ CLICK-ID FILTER: NO CLICK-ID DETECTED ═══');
      reasoning.push('❌ No gclid/fbclid/ttclid/click_id found');
      reasoning.push('❌ NO ECONOMIC VALUE - Cannot go to REAL');
      reasoning.push('Note: UTMs alone are NOT economic signals');

      // Even if all other checks pass, without click-id, decision is human_no_value
      const coherenceScore = this.calculateCoherence(context, reasoning);
      const humanNoiseScore = this.evaluateHumanNoise(context, reasoning);
      const perfectionPenalty = this.detectExcessivePerfection(context, reasoning);
      const temporalVariance = this.calculateTemporalVariance(context, reasoning);

      const factors: RiskFactors = {
        platformTrust: profile.baseTrustScore,
        headerCoherence: this.calculateHeaderCoherence(context),
        behaviorCoherence: this.calculateBehaviorCoherence(context),
        timingNaturalness: this.calculateTimingNaturalness(context),
        navigationPattern: this.calculateNavigationPattern(context),
      };

      // If human signals are strong, it's human_no_value (human without economic value)
      // Otherwise, it's safe (bot or suspicious)
      const decision = (humanNoiseScore > 0.3 && coherenceScore > 0.5) ? 'human_no_value' : 'safe';

      reasoning.push(`═══ FINAL DECISION: ${decision.toUpperCase()} ═══`);
      if (decision === 'human_no_value') {
        reasoning.push('Human-like but NO economic value (no click-id)');
      }

      return {
        finalRisk: 1.0,
        decision,
        coherenceScore,
        humanNoiseScore,
        perfectionPenalty,
        temporalVariance,
        clickIdScore: 0.0,
        economicValue: false,
        factors,
        reasoning,
      };
    }

    // Click-ID present - validate it
    if (!context.clickId.isValid) {
      reasoning.push('═══ CLICK-ID FILTER: INVALID CLICK-ID ═══');
      reasoning.push(`❌ Network: ${context.clickId.network}`);
      reasoning.push(`❌ Errors: ${context.clickId.validationErrors.join(', ')}`);
      reasoning.push(`❌ Entropy: ${context.clickId.entropy.toFixed(2)}`);
      reasoning.push('❌ FORGED/RECYCLED CLICK-ID - Cannot go to REAL');

      const coherenceScore = this.calculateCoherence(context, reasoning);
      const humanNoiseScore = this.evaluateHumanNoise(context, reasoning);
      const perfectionPenalty = this.detectExcessivePerfection(context, reasoning);
      const temporalVariance = this.calculateTemporalVariance(context, reasoning);

      const factors: RiskFactors = {
        platformTrust: profile.baseTrustScore,
        headerCoherence: this.calculateHeaderCoherence(context),
        behaviorCoherence: this.calculateBehaviorCoherence(context),
        timingNaturalness: this.calculateTimingNaturalness(context),
        navigationPattern: this.calculateNavigationPattern(context),
      };

      return {
        finalRisk: 0.9,
        decision: 'safe',
        coherenceScore,
        humanNoiseScore,
        perfectionPenalty,
        temporalVariance,
        clickIdScore: 0.2,
        economicValue: false,
        factors,
        reasoning,
      };
    }

    // Valid click-id found! This traffic has economic value
    clickIdScore = 1.0;
    economicValue = true;

    reasoning.push('═══ CLICK-ID FILTER: VALID CLICK-ID ✓ ═══');
    reasoning.push(`✓ Network: ${context.clickId.network}`);
    reasoning.push(`✓ Entropy: ${context.clickId.entropy.toFixed(2)}`);
    reasoning.push(`✓ Referer Match: ${context.clickId.refererMatch ? 'YES' : 'NO (OK for iOS/Safari)'}`);
    reasoning.push('✓ HAS ECONOMIC VALUE - Eligible for REAL');

    // 🔥 GOOGLE ADS MODE: gclid válido tem PRIORIDADE ABSOLUTA
    // iOS/Safari/WebView não enviam referer - isso é NORMAL e LEGÍTIMO
    // gclid válido + não-datacenter = forte candidato a REAL
    const isGoogleAds = context.clickId.network === 'google_ads';
    const isDatacenter = context.isDatacenter || false;
    const isBotDetected = context.isBotDetected || false;

    // 🎯 DETERMINISTIC OVERRIDE: Valid gclid + NOT datacenter + NOT bot = REAL
    if (isGoogleAds && !isDatacenter && !isBotDetected) {
      reasoning.push('🔥 GOOGLE ADS MODE: DETERMINISTIC OVERRIDE');
      reasoning.push('→ gclid VALID ✓');
      reasoning.push('→ NOT datacenter ✓');
      reasoning.push('→ NOT bot ✓');
      reasoning.push('→ DECISION: REAL (bypassing probabilistic scoring)');

      // Explicit console log for operational proof
      console.log('[GOOGLE_ADS_MODE]', {
        gclidDetected: true,
        gclidValid: true,
        network: context.clickId.network,
        isDatacenter,
        isBotDetected,
        decisionFinal: 'real',
        reason: 'DETERMINISTIC_OVERRIDE',
      });

      const factors: RiskFactors = {
        platformTrust: profile.baseTrustScore,
        headerCoherence: 1.0,
        behaviorCoherence: 1.0,
        timingNaturalness: 1.0,
        navigationPattern: 1.0,
      };

      return {
        finalRisk: 0.05,
        decision: 'real',
        coherenceScore: 1.0,
        humanNoiseScore: 1.0,
        perfectionPenalty: 0.0,
        temporalVariance: 1.0,
        clickIdScore: 1.0,
        economicValue: true,
        factors,
        reasoning,
      };
    }

    if (isGoogleAds) {
      reasoning.push('🔥 GOOGLE ADS MODE ACTIVATED');
      reasoning.push('→ gclid validity = ABSOLUTE PRIORITY');
      reasoning.push('→ Referer absence = NORMAL (iOS/Safari/WebView reality)');
      reasoning.push('→ Human signals MODULATE score, do NOT block');
      reasoning.push('→ Only blocks: bot detection, datacenter, click-id reuse');

      // Log when Google Ads Mode is active but NOT overriding
      console.log('[GOOGLE_ADS_MODE]', {
        gclidDetected: true,
        gclidValid: true,
        network: context.clickId.network,
        isDatacenter,
        isBotDetected,
        reason: 'ENTERING_PROBABILISTIC_SCORING',
      });
    }

    // Now evaluate other factors (but click-id is the PRIMARY filter)
    const coherenceScore = this.calculateCoherence(context, reasoning);
    const humanNoiseScore = this.evaluateHumanNoise(context, reasoning);
    const perfectionPenalty = this.detectExcessivePerfection(context, reasoning);
    const temporalVariance = this.calculateTemporalVariance(context, reasoning);

    const factors: RiskFactors = {
      platformTrust: profile.baseTrustScore,
      headerCoherence: this.calculateHeaderCoherence(context),
      behaviorCoherence: this.calculateBehaviorCoherence(context),
      timingNaturalness: this.calculateTimingNaturalness(context),
      navigationPattern: this.calculateNavigationPattern(context),
    };

    const baseRisk = 1.0 - profile.baseTrustScore;

    // Google Ads Mode: Reduce weight of human signals
    // gclid valid = strong signal, other factors are supplementary
    let contextRiskWeights = {
      coherence: 0.25,
      humanNoise: 0.30,
      perfection: 0.25,
      temporal: 0.20,
    };

    if (isGoogleAds) {
      // Google Ads: gclid is 80% of decision, other signals are 20%
      contextRiskWeights = {
        coherence: 0.10,
        humanNoise: 0.10,
        perfection: 0.05,
        temporal: 0.05,
      };
      reasoning.push('GOOGLE ADS: Reduced weight of secondary signals (gclid = primary)');
    }

    const contextRisk = (
      (1.0 - coherenceScore) * contextRiskWeights.coherence +
      (1.0 - humanNoiseScore) * contextRiskWeights.humanNoise +
      perfectionPenalty * contextRiskWeights.perfection +
      (1.0 - Math.min(temporalVariance, 1.0)) * contextRiskWeights.temporal
    ) * profile.contextWeight;

    let adjustedContextRisk = contextRisk;

    // Desktop hardening ONLY applies to non-Google Ads traffic
    // Google Ads can be desktop with low noise and still be valid
    if (!isGoogleAds && context.platformType === 'desktop' && context.passedAllLayers) {
      if (perfectionPenalty < 0.1 && humanNoiseScore < profile.minHumanNoiseRequired) {
        adjustedContextRisk += 0.3;
        reasoning.push('DESKTOP HARDENING: Perfect passage without human noise - adding risk penalty');
      }
    }

    let finalRisk = (baseRisk * 0.4) + (adjustedContextRisk * 0.6);

    // Google Ads Mode: Cap maximum risk
    // Valid gclid should never result in high risk unless datacenter/bot
    if (isGoogleAds) {
      finalRisk = Math.min(finalRisk, 0.35);
      reasoning.push(`GOOGLE ADS: Risk capped at 0.35 (gclid validity protection)`);
    }

    finalRisk = Math.min(Math.max(finalRisk, 0.0), 1.0);

    reasoning.push(`Risk calculation: base(${baseRisk.toFixed(2)}) * 0.4 + context(${adjustedContextRisk.toFixed(2)}) * 0.6 = ${finalRisk.toFixed(2)}`);

    const decision = this.makeDecision(
      finalRisk,
      humanNoiseScore,
      coherenceScore,
      profile,
      context,
      reasoning
    );

    // Final log for Google Ads Mode (probabilistic path)
    if (isGoogleAds) {
      const riskBeforeCap = (baseRisk * 0.4) + (adjustedContextRisk * 0.6);
      console.log('[GOOGLE_ADS_MODE]', {
        gclidDetected: true,
        gclidValid: true,
        network: context.clickId.network,
        isDatacenter,
        isBotDetected,
        riskBeforeCap: riskBeforeCap.toFixed(3),
        riskAfterCap: finalRisk.toFixed(3),
        humanNoiseScore: humanNoiseScore.toFixed(3),
        coherenceScore: coherenceScore.toFixed(3),
        decisionFinal: decision,
        reason: 'PROBABILISTIC_SCORING_RESULT',
      });
    }

    return {
      finalRisk,
      decision,
      coherenceScore,
      humanNoiseScore,
      perfectionPenalty,
      temporalVariance,
      clickIdScore,
      economicValue,
      factors,
      reasoning,
    };
  }

  private calculateCoherence(context: RiskContext, reasoning: string[]): number {
    let score = 0.5;
    const checks: string[] = [];

    const headerCoherence = this.calculateHeaderCoherence(context);
    score = (score + headerCoherence) / 2;

    const behaviorCoherence = this.calculateBehaviorCoherence(context);
    score = (score + behaviorCoherence) / 2;

    if (context.platformType === 'mobile') {
      const ua = context.userAgent.toLowerCase();
      const hasMobileUA = /mobile|android|iphone|ipad/i.test(ua);
      if (!hasMobileUA) {
        score -= 0.3;
        checks.push('Platform mismatch: claims mobile but UA suggests otherwise');
      }
    }

    if (context.platformType === 'desktop') {
      const ua = context.userAgent.toLowerCase();
      if (/mobile|android|iphone/i.test(ua)) {
        score -= 0.2;
        checks.push('Platform mismatch: claims desktop but UA suggests mobile');
      }
    }

    if (context.country === 'BR' && context.headers['ACCEPT-LANGUAGE']) {
      const lang = context.headers['ACCEPT-LANGUAGE'].toLowerCase();
      if (!lang.includes('pt') && !lang.includes('br')) {
        score -= 0.1;
        checks.push('Language mismatch: BR IP but no Portuguese in Accept-Language');
      }
    }

    score = Math.min(Math.max(score, 0.0), 1.0);

    if (checks.length > 0) {
      reasoning.push(`Coherence issues: ${checks.join('; ')}`);
    }
    reasoning.push(`Coherence score: ${score.toFixed(2)}`);

    return score;
  }

  private calculateHeaderCoherence(context: RiskContext): number {
    let score = 0.5;
    const headers = context.headers;

    const standardHeaders = ['USER-AGENT', 'ACCEPT', 'ACCEPT-LANGUAGE', 'ACCEPT-ENCODING'];
    const presentStandard = standardHeaders.filter(h =>
      headers[h] || headers[h.toLowerCase()] || headers[h.replace(/-/g, '_')]
    ).length;
    score += (presentStandard / standardHeaders.length) * 0.3;

    const headerKeys = Object.keys(headers);
    const casePatterns = {
      allUpper: headerKeys.filter(k => k === k.toUpperCase()).length,
      allLower: headerKeys.filter(k => k === k.toLowerCase()).length,
      mixed: headerKeys.length - Math.max(
        headerKeys.filter(k => k === k.toUpperCase()).length,
        headerKeys.filter(k => k === k.toLowerCase()).length
      ),
    };

    if (casePatterns.mixed > headerKeys.length * 0.3) {
      score -= 0.1;
    }

    if (headers['X-REQUESTED-WITH'] === 'XMLHttpRequest' && !context.hasReferer) {
      score -= 0.15;
    }

    return Math.min(Math.max(score, 0.0), 1.0);
  }

  private calculateBehaviorCoherence(context: RiskContext): number {
    let score = 0.5;

    if (context.navigationDepth > 0) {
      score += 0.1;
    }

    if (context.hasReferer) {
      score += 0.15;
    }

    if (context.sessionData) {
      if (context.sessionData.previousRequests && context.sessionData.previousRequests > 1) {
        score += 0.1;
      }
      if (context.sessionData.pagesVisited && context.sessionData.pagesVisited.length > 1) {
        score += 0.1;
      }
    }

    return Math.min(Math.max(score, 0.0), 1.0);
  }

  private evaluateHumanNoise(context: RiskContext, reasoning: string[]): number {
    let noiseScore = 0.0;
    const signals: string[] = [];

    if (context.sessionData) {
      if (context.sessionData.hasScrolled) {
        noiseScore += 0.1;
        signals.push('scroll');
      }
      if (context.sessionData.hasMouseMovement) {
        noiseScore += 0.15;
        signals.push('mouse');
      }
      if (context.sessionData.hasFocusBlur) {
        noiseScore += 0.1;
        signals.push('focus/blur');
      }
      if (context.sessionData.viewportChanges && context.sessionData.viewportChanges > 0) {
        noiseScore += 0.1;
        signals.push('viewport');
      }
      if (context.sessionData.avgTimeBetweenRequests) {
        const avgTime = context.sessionData.avgTimeBetweenRequests;
        if (avgTime > 500 && avgTime < 30000) {
          noiseScore += 0.15;
          signals.push('natural timing');
        }
      }
    }

    const ua = context.userAgent;
    if (ua && ua.length > 50) {
      const hasMinorVersion = /\d+\.\d+\.\d+/.test(ua);
      if (hasMinorVersion) {
        noiseScore += 0.05;
        signals.push('detailed UA');
      }
    }

    if (context.hasReferer) {
      noiseScore += 0.1;
      signals.push('referer');
    }

    if (context.navigationDepth > 0) {
      noiseScore += 0.05 * Math.min(context.navigationDepth, 3);
      signals.push(`depth:${context.navigationDepth}`);
    }

    noiseScore = Math.min(noiseScore, 1.0);

    if (signals.length > 0) {
      reasoning.push(`Human signals detected: ${signals.join(', ')} (noise score: ${noiseScore.toFixed(2)})`);
    } else {
      reasoning.push(`No human signals detected (noise score: 0.00)`);
    }

    return noiseScore;
  }

  private detectExcessivePerfection(context: RiskContext, reasoning: string[]): number {
    let perfectionScore = 0.0;
    const perfectSignals: string[] = [];

    if (context.passedAllLayers) {
      perfectionScore += 0.2;
      perfectSignals.push('passed all layers');
    }

    const headerCount = Object.keys(context.headers).length;
    if (headerCount >= 8 && headerCount <= 15) {
      perfectionScore += 0.15;
      perfectSignals.push('ideal header count');
    }

    const requestDuration = Date.now() - this.requestStartTime;
    if (requestDuration >= 100 && requestDuration <= 500) {
      perfectionScore += 0.15;
      perfectSignals.push('ideal response time');
    }

    const standardHeaders = ['HOST', 'USER-AGENT', 'ACCEPT', 'ACCEPT-LANGUAGE', 'ACCEPT-ENCODING', 'CONNECTION'];
    const hasAllStandard = standardHeaders.every(h =>
      context.headers[h] || context.headers[h.toLowerCase()]
    );
    if (hasAllStandard) {
      perfectionScore += 0.2;
      perfectSignals.push('all standard headers');
    }

    if (!context.hasReferer && context.navigationDepth === 0) {
      perfectionScore += 0.15;
      perfectSignals.push('linear navigation');
    }

    if (context.sessionData?.avgTimeBetweenRequests) {
      const variance = this.calculateTimingConsistency(context);
      if (variance < 0.1) {
        perfectionScore += 0.15;
        perfectSignals.push('consistent timing');
      }
    }

    let penalty = 0.0;
    if (perfectionScore > 0.7) {
      penalty = (perfectionScore - 0.7) * 2.0;
    } else if (perfectionScore > 0.5) {
      penalty = (perfectionScore - 0.5) * 0.5;
    }

    penalty = Math.min(penalty, 1.0);

    if (perfectSignals.length > 0) {
      reasoning.push(`Perfection signals: ${perfectSignals.join(', ')} (penalty: ${penalty.toFixed(2)})`);
    }

    return penalty;
  }

  private calculateTemporalVariance(context: RiskContext, reasoning: string[]): number {
    if (!context.sessionData?.avgTimeBetweenRequests) {
      return 0.0;
    }

    const avgTime = context.sessionData.avgTimeBetweenRequests;

    if (avgTime < 100) {
      reasoning.push('Temporal: Too fast between requests (bot-like)');
      return 0.0;
    }

    if (avgTime > 60000) {
      reasoning.push('Temporal: Very slow - could be human or sophisticated bot');
      return 0.5;
    }

    if (avgTime >= 1000 && avgTime <= 10000) {
      reasoning.push('Temporal: Natural human timing range');
      return 0.8;
    }

    return 0.4;
  }

  private calculateTimingNaturalness(context: RiskContext): number {
    if (!context.sessionData?.avgTimeBetweenRequests) {
      return 0.5;
    }

    const avgTime = context.sessionData.avgTimeBetweenRequests;

    if (avgTime >= 2000 && avgTime <= 8000) return 0.9;
    if (avgTime >= 1000 && avgTime <= 15000) return 0.7;
    if (avgTime >= 500 && avgTime <= 30000) return 0.5;
    if (avgTime < 200) return 0.1;

    return 0.3;
  }

  private calculateNavigationPattern(context: RiskContext): number {
    let score = 0.5;

    if (context.hasReferer) score += 0.2;
    if (context.navigationDepth > 0) score += 0.1 * Math.min(context.navigationDepth, 3);

    if (context.sessionData?.pagesVisited && context.sessionData.pagesVisited.length > 1) {
      score += 0.15;
    }

    return Math.min(score, 1.0);
  }

  private calculateTimingConsistency(context: RiskContext): number {
    return 0.5;
  }

  private makeDecision(
    finalRisk: number,
    humanNoiseScore: number,
    coherenceScore: number,
    profile: PlatformProfile,
    context: RiskContext,
    reasoning: string[]
  ): 'real' | 'safe' | 'safe_observe' {
    // 🔥 GOOGLE ADS MODE: Simplified decision logic
    // Valid gclid + not datacenter/bot = REAL (almost always)
    const isGoogleAds = context.clickId?.network === 'google_ads' && context.clickId?.isValid;

    if (isGoogleAds) {
      // Google Ads: Risk threshold is much higher
      // Only blocks if explicitly detected as datacenter/bot
      if (finalRisk <= 0.5) {
        reasoning.push('🔥 GOOGLE ADS DECISION: Valid gclid + acceptable risk - routing to REAL');
        reasoning.push('→ gclid validity is the PRIMARY signal');
        reasoning.push('→ Low human noise is ACCEPTABLE (landing page behavior)');
        return 'real';
      }

      // High risk with gclid means datacenter or bot patterns
      if (finalRisk > 0.7) {
        reasoning.push('GOOGLE ADS DECISION: High risk despite gclid - datacenter or bot detected - routing to SAFE');
        return 'safe';
      }

      // Medium-high risk: observe
      reasoning.push('GOOGLE ADS DECISION: Medium risk - routing to SAFE_OBSERVE');
      return 'safe_observe';
    }

    // Non-Google Ads: Original strict logic
    if (finalRisk <= 0.3 && humanNoiseScore >= profile.minHumanNoiseRequired) {
      if (profile.directToRealAllowed || context.platformType === 'mobile') {
        if (context.platformType === 'desktop') {
          if (humanNoiseScore < 0.2 || coherenceScore < 0.7) {
            reasoning.push('DECISION: Desktop requires stronger human signals - routing to SAFE_OBSERVE');
            return 'safe_observe';
          }
        }
        reasoning.push('DECISION: Low risk + human signals - routing to REAL');
        return 'real';
      } else {
        reasoning.push('DECISION: Low risk but platform requires observation - routing to SAFE_OBSERVE');
        return 'safe_observe';
      }
    }

    if (finalRisk <= 0.5) {
      reasoning.push('DECISION: Medium risk - routing to SAFE_OBSERVE for learning');
      return 'safe_observe';
    }

    reasoning.push('DECISION: High risk - routing to SAFE');
    return 'safe';
  }
}

export async function saveRiskAssessment(
  supabaseUrl: string,
  supabaseServiceKey: string,
  domainId: string,
  context: RiskContext,
  assessment: RiskAssessment
): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('risk_assessments').insert({
      domain_id: domainId,
      ip: context.ip,
      user_agent: context.userAgent,
      platform_type: context.platformType,
      raw_score: assessment.finalRisk,
      risk_factors: assessment.factors,
      decision: assessment.decision,
      coherence_score: assessment.coherenceScore,
      human_noise_score: assessment.humanNoiseScore,
      perfection_penalty: assessment.perfectionPenalty,
      temporal_variance: assessment.temporalVariance,
      navigation_depth: context.navigationDepth,
      session_context: context.sessionData || {},
    });
  } catch (error) {
    console.error('[Risk Scoring] Failed to save assessment:', error);
  }
}

export function detectPlatformType(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (/mobile|android(?!.*tablet)|iphone|ipod|blackberry|windows phone|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }

  if (/tablet|ipad|playbook|silk|kindle/i.test(ua)) {
    return 'tablet';
  }

  if (/windows|macintosh|linux|x11/i.test(ua) && !/mobile/i.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}
