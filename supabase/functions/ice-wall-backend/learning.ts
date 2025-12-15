import { createClient } from "npm:@supabase/supabase-js@2";

interface ConsolidationContext {
  signature_hash: string;
  pattern_class: string;
  behavior_profile: Record<string, any>;
  occurrence_count: number;
  context_variations: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface PerfectionAnalysis {
  isPerfect: boolean;
  perfectionScore: number;
  suspicionLevel: 'none' | 'low' | 'medium' | 'high';
  indicators: string[];
}

async function generateContextHash(
  ip: string,
  userAgent: string,
  headerFingerprint: string
): Promise<string> {
  const contextString = `${ip}_${userAgent}_${headerFingerprint}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(contextString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function analyzePatternPerfection(
  pattern: any,
  occurrenceCount: number,
  contextVariations: number
): PerfectionAnalysis {
  const indicators: string[] = [];
  let perfectionScore = 0;

  const stabilityRatio = occurrenceCount / Math.max(contextVariations, 1);
  if (stabilityRatio > 10) {
    perfectionScore += 0.3;
    indicators.push(`High stability ratio: ${stabilityRatio.toFixed(1)}`);
  }

  if (pattern.feature_vector) {
    const features = pattern.feature_vector;

    if (features.header_order_entropy !== undefined) {
      if (features.header_order_entropy > 0.9) {
        perfectionScore += 0.2;
        indicators.push('Perfect header order entropy');
      }
    }

    if (features.header_case_consistency === true) {
      perfectionScore += 0.1;
      indicators.push('Perfect header case consistency');
    }

    if (features.has_user_agent && features.has_referer && features.has_accept_language) {
      perfectionScore += 0.15;
      indicators.push('All standard headers present');
    }

    if (features.is_direct_access === true && features.url_depth === 0) {
      perfectionScore += 0.1;
      indicators.push('Linear direct access pattern');
    }
  }

  if (contextVariations <= 1 && occurrenceCount > 5) {
    perfectionScore += 0.25;
    indicators.push('No context variation despite multiple occurrences');
  }

  let suspicionLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (perfectionScore >= 0.7) {
    suspicionLevel = 'high';
  } else if (perfectionScore >= 0.5) {
    suspicionLevel = 'medium';
  } else if (perfectionScore >= 0.3) {
    suspicionLevel = 'low';
  }

  return {
    isPerfect: perfectionScore >= 0.6,
    perfectionScore,
    suspicionLevel,
    indicators,
  };
}

async function penalizePerfectPatterns(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ penalized: number; flagged: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let penalized = 0;
  let flagged = 0;

  const { data: patterns } = await supabase
    .from('learned_patterns')
    .select('*')
    .in('learning_stage', ['emerging', 'established'])
    .gte('occurrence_count', 3);

  if (!patterns) return { penalized: 0, flagged: 0 };

  for (const pattern of patterns) {
    const analysis = analyzePatternPerfection(
      pattern,
      pattern.occurrence_count,
      pattern.context_variations || 1
    );

    if (analysis.isPerfect) {
      flagged++;

      const perfectionPenalty = analysis.perfectionScore * 0.5;
      const newConfidence = Math.max(
        (pattern.confidence_score || 0.5) - perfectionPenalty,
        0.1
      );

      await supabase
        .from('learned_patterns')
        .update({
          confidence_score: newConfidence,
          behavior_profile: {
            ...pattern.behavior_profile,
            perfection_analysis: {
              score: analysis.perfectionScore,
              suspicion: analysis.suspicionLevel,
              indicators: analysis.indicators,
              analyzed_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', pattern.id);

      if (analysis.suspicionLevel === 'high') {
        penalized++;

        await supabase
          .from('learned_patterns')
          .update({
            learning_stage: 'suspicious_perfect',
          })
          .eq('id', pattern.id);
      }
    }
  }

  return { penalized, flagged };
}

async function detectStabilityAnomalies(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ anomalies: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let anomalies = 0;

  const { data: patterns } = await supabase
    .from('learned_patterns')
    .select('*')
    .in('learning_stage', ['established'])
    .gte('occurrence_count', 10);

  if (!patterns) return { anomalies: 0 };

  for (const pattern of patterns) {
    const firstSeen = new Date(pattern.first_seen_at).getTime();
    const lastSeen = new Date(pattern.last_seen_at).getTime();
    const hoursBetween = (lastSeen - firstSeen) / (1000 * 60 * 60);

    if (hoursBetween > 0) {
      const occurrencesPerHour = pattern.occurrence_count / hoursBetween;

      if (occurrencesPerHour > 10) {
        anomalies++;

        await supabase
          .from('learned_patterns')
          .update({
            behavior_profile: {
              ...pattern.behavior_profile,
              stability_anomaly: {
                occurrences_per_hour: occurrencesPerHour,
                detected_at: new Date().toISOString(),
                type: 'high_frequency',
              },
            },
            confidence_score: Math.max((pattern.confidence_score || 0.5) * 0.7, 0.1),
          })
          .eq('id', pattern.id);
      }

      const contextRatio = (pattern.context_variations || 1) / pattern.occurrence_count;
      if (contextRatio < 0.05 && pattern.occurrence_count > 20) {
        anomalies++;

        await supabase
          .from('learned_patterns')
          .update({
            behavior_profile: {
              ...pattern.behavior_profile,
              stability_anomaly: {
                context_ratio: contextRatio,
                detected_at: new Date().toISOString(),
                type: 'low_variation',
              },
            },
            confidence_score: Math.max((pattern.confidence_score || 0.5) * 0.6, 0.1),
          })
          .eq('id', pattern.id);
      }
    }
  }

  return { anomalies };
}

async function consolidatePatternsToLearning(
  supabaseUrl: string,
  supabaseServiceKey: string,
  windowId: string
): Promise<{ processed: number; consolidated: number; discarded: number }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let processed = 0;
  let consolidated = 0;
  let discarded = 0;

  const { data: patterns, error: fetchError } = await supabase
    .from('behavioral_patterns')
    .select('*')
    .gte('last_seen', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('occurrence_count', { ascending: false });

  if (fetchError || !patterns) {
    console.error('[Learning Consolidator] Failed to fetch patterns:', fetchError);
    return { processed: 0, consolidated: 0, discarded: 0 };
  }

  for (const pattern of patterns) {
    processed++;

    if (pattern.occurrence_count < 3) {
      discarded++;
      continue;
    }

    const signatureHash = pattern.pattern_hash;
    const patternClass = pattern.traffic_classification;
    const behaviorProfile = pattern.feature_vector;

    const perfectionAnalysis = analyzePatternPerfection(
      pattern,
      pattern.occurrence_count,
      1
    );

    const { data: existing } = await supabase
      .from('learned_patterns')
      .select('id, occurrence_count, context_variations, last_seen_at')
      .eq('signature_hash', signatureHash)
      .maybeSingle();

    if (existing) {
      let newStage = existing.occurrence_count >= 5 ? 'established' : 'emerging';

      if (perfectionAnalysis.suspicionLevel === 'high') {
        newStage = 'suspicious_perfect';
      }

      const { error: updateError } = await supabase
        .from('learned_patterns')
        .update({
          occurrence_count: existing.occurrence_count + pattern.occurrence_count,
          last_seen_at: pattern.last_seen,
          decay_coefficient: 1.0,
          last_decay_applied: new Date().toISOString(),
          learning_stage: newStage,
          behavior_profile: {
            ...behaviorProfile,
            perfection_analysis: perfectionAnalysis.isPerfect ? {
              score: perfectionAnalysis.perfectionScore,
              suspicion: perfectionAnalysis.suspicionLevel,
              indicators: perfectionAnalysis.indicators,
            } : undefined,
          },
        })
        .eq('id', existing.id);

      if (!updateError) {
        await supabase.from('pattern_consolidation').insert({
          learned_pattern_id: existing.id,
          observation_ref: pattern.id,
          context_hash: signatureHash,
          evidence_profile: behaviorProfile,
          learning_window_id: windowId,
          captured_at: pattern.last_seen
        });

        consolidated++;
      }
    } else {
      let initialStage = 'emerging';
      if (perfectionAnalysis.suspicionLevel === 'high') {
        initialStage = 'suspicious_perfect';
      }

      const { data: newPattern, error: insertError } = await supabase
        .from('learned_patterns')
        .insert({
          signature_hash: signatureHash,
          pattern_class: patternClass,
          behavior_profile: {
            ...behaviorProfile,
            perfection_analysis: perfectionAnalysis.isPerfect ? {
              score: perfectionAnalysis.perfectionScore,
              suspicion: perfectionAnalysis.suspicionLevel,
              indicators: perfectionAnalysis.indicators,
            } : undefined,
          },
          occurrence_count: pattern.occurrence_count,
          context_variations: 1,
          first_seen_at: pattern.first_seen,
          last_seen_at: pattern.last_seen,
          learning_stage: initialStage
        })
        .select('id')
        .single();

      if (!insertError && newPattern) {
        await supabase.from('pattern_consolidation').insert({
          learned_pattern_id: newPattern.id,
          observation_ref: pattern.id,
          context_hash: signatureHash,
          evidence_profile: behaviorProfile,
          learning_window_id: windowId,
          captured_at: pattern.last_seen
        });

        consolidated++;
      }
    }
  }

  return { processed, consolidated, discarded };
}

async function analyzeContextDiversity(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: patterns } = await supabase
    .from('learned_patterns')
    .select('id, signature_hash')
    .in('learning_stage', ['emerging', 'established', 'suspicious_perfect']);

  if (!patterns) return;

  for (const pattern of patterns) {
    const { data: evidences } = await supabase
      .from('pattern_consolidation')
      .select('context_hash')
      .eq('learned_pattern_id', pattern.id);

    if (evidences && evidences.length > 0) {
      const uniqueContexts = new Set(evidences.map(e => e.context_hash));

      await supabase
        .from('learned_patterns')
        .update({
          context_variations: uniqueContexts.size
        })
        .eq('id', pattern.id);
    }
  }
}

async function recalculateConfidenceScores(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: patterns } = await supabase
    .from('learned_patterns')
    .select('*')
    .in('learning_stage', ['emerging', 'established', 'fading', 'suspicious_perfect']);

  if (!patterns) return;

  for (const pattern of patterns) {
    const { data: confidence } = await supabase.rpc('compute_pattern_confidence', {
      p_occurrence_count: pattern.occurrence_count,
      p_context_variations: pattern.context_variations,
      p_persistence_hours: pattern.persistence_hours || 0,
      p_decay_coefficient: pattern.decay_coefficient
    });

    if (confidence !== null) {
      let adjustedConfidence = confidence;

      if (pattern.behavior_profile?.perfection_analysis) {
        const perfScore = pattern.behavior_profile.perfection_analysis.score || 0;
        if (perfScore > 0.6) {
          adjustedConfidence = adjustedConfidence * (1 - (perfScore * 0.3));
        }
      }

      let newStage = pattern.learning_stage;
      if (adjustedConfidence >= 0.6 && pattern.occurrence_count >= 5) {
        if (pattern.learning_stage !== 'suspicious_perfect') {
          newStage = 'established';
        }
      }

      await supabase
        .from('learned_patterns')
        .update({
          confidence_score: adjustedConfidence,
          learning_stage: newStage
        })
        .eq('id', pattern.id);
    }
  }
}

export async function runLearningConsolidation(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{
  success: boolean;
  stats: {
    patterns_processed: number;
    patterns_consolidated: number;
    patterns_discarded: number;
    patterns_penalized: number;
    patterns_flagged: number;
    stability_anomalies: number;
    decay_applied: boolean;
  };
}> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date();

    const { data: window, error: windowError } = await supabase
      .from('learning_windows')
      .insert({
        starts_at: windowStart.toISOString(),
        ends_at: windowEnd.toISOString(),
        duration_hours: 24,
        window_status: 'collecting'
      })
      .select('id')
      .single();

    if (windowError || !window) {
      console.error('[Learning Consolidator] Failed to create window:', windowError);
      return {
        success: false,
        stats: {
          patterns_processed: 0,
          patterns_consolidated: 0,
          patterns_discarded: 0,
          patterns_penalized: 0,
          patterns_flagged: 0,
          stability_anomalies: 0,
          decay_applied: false
        }
      };
    }

    await supabase
      .from('learning_windows')
      .update({ window_status: 'processing' })
      .eq('id', window.id);

    const consolidationResult = await consolidatePatternsToLearning(
      supabaseUrl,
      supabaseServiceKey,
      window.id
    );

    await analyzeContextDiversity(supabaseUrl, supabaseServiceKey);

    const perfectionResult = await penalizePerfectPatterns(
      supabaseUrl,
      supabaseServiceKey
    );

    const stabilityResult = await detectStabilityAnomalies(
      supabaseUrl,
      supabaseServiceKey
    );

    await supabase.rpc('execute_pattern_decay');

    await recalculateConfidenceScores(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('learning_windows')
      .update({
        window_status: 'finalized',
        observations_processed: consolidationResult.processed,
        patterns_discovered: consolidationResult.consolidated,
        noise_discarded: consolidationResult.discarded,
        finalized_at: new Date().toISOString()
      })
      .eq('id', window.id);

    return {
      success: true,
      stats: {
        patterns_processed: consolidationResult.processed,
        patterns_consolidated: consolidationResult.consolidated,
        patterns_discarded: consolidationResult.discarded,
        patterns_penalized: perfectionResult.penalized,
        patterns_flagged: perfectionResult.flagged,
        stability_anomalies: stabilityResult.anomalies,
        decay_applied: true
      }
    };

  } catch (error) {
    console.error('[Learning Consolidator] Unexpected error:', error);
    return {
      success: false,
      stats: {
        patterns_processed: 0,
        patterns_consolidated: 0,
        patterns_discarded: 0,
        patterns_penalized: 0,
        patterns_flagged: 0,
        stability_anomalies: 0,
        decay_applied: false
      }
    };
  }
}

export async function getLearningInsights(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{
  total_patterns: number;
  established_patterns: number;
  emerging_patterns: number;
  fading_patterns: number;
  suspicious_perfect_patterns: number;
  avg_confidence: number;
  high_confidence_patterns: number;
  perfection_analysis: {
    total_flagged: number;
    high_suspicion: number;
    medium_suspicion: number;
  };
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: stats } = await supabase
    .from('learned_patterns')
    .select('learning_stage, confidence_score, behavior_profile');

  if (!stats) {
    return {
      total_patterns: 0,
      established_patterns: 0,
      emerging_patterns: 0,
      fading_patterns: 0,
      suspicious_perfect_patterns: 0,
      avg_confidence: 0,
      high_confidence_patterns: 0,
      perfection_analysis: {
        total_flagged: 0,
        high_suspicion: 0,
        medium_suspicion: 0,
      },
    };
  }

  const established = stats.filter(p => p.learning_stage === 'established').length;
  const emerging = stats.filter(p => p.learning_stage === 'emerging').length;
  const fading = stats.filter(p => p.learning_stage === 'fading').length;
  const suspiciousPerfect = stats.filter(p => p.learning_stage === 'suspicious_perfect').length;
  const highConfidence = stats.filter(p => p.confidence_score >= 0.7).length;
  const avgConfidence = stats.length > 0
    ? stats.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / stats.length
    : 0;

  const patternsWithPerfection = stats.filter(p =>
    p.behavior_profile?.perfection_analysis
  );
  const highSuspicion = patternsWithPerfection.filter(p =>
    p.behavior_profile?.perfection_analysis?.suspicion === 'high'
  ).length;
  const mediumSuspicion = patternsWithPerfection.filter(p =>
    p.behavior_profile?.perfection_analysis?.suspicion === 'medium'
  ).length;

  return {
    total_patterns: stats.length,
    established_patterns: established,
    emerging_patterns: emerging,
    fading_patterns: fading,
    suspicious_perfect_patterns: suspiciousPerfect,
    avg_confidence: avgConfidence,
    high_confidence_patterns: highConfidence,
    perfection_analysis: {
      total_flagged: patternsWithPerfection.length,
      high_suspicion: highSuspicion,
      medium_suspicion: mediumSuspicion,
    },
  };
}

export { analyzePatternPerfection, PerfectionAnalysis };
