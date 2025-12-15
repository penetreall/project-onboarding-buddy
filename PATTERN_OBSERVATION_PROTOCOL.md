# Pattern Observation Protocol

**Status**: Shadow Mode - Silent Collection Only
**Phase**: Data Gathering (7-14 days minimum)
**Next Phase**: Manual Analysis & Hypothesis Validation

---

## System Architecture

### What is Running

**Backend Observer** (`supabase/functions/ice-wall-backend/observer.ts`)
- Passive behavioral feature extraction
- Pattern hashing (SHA-256, irreversible)
- Async persistence to `behavioral_patterns` table
- Zero impact on production traffic (fail-safe, fire-and-forget)

**Database** (`behavioral_patterns` table)
- Stores aggregated pattern observations
- Features: temporal, header, navigation, platform signals
- Classification: legitimate, suspicious, blocked
- Occurrence counts and time windows (first_seen, last_seen)

### What is NOT Running

- No dashboard or visualization
- No API endpoints for pattern analytics
- No adaptive responses
- No real-time feedback loops
- No automated decisions based on patterns

---

## Manual Analysis Queries

After 7-14 days of observation (minimum 1000 observations), run these queries:

### 1. Overall Collection Status

```sql
SELECT
  traffic_classification,
  COUNT(*) as unique_patterns,
  SUM(occurrence_count) as total_observations,
  ROUND(AVG(occurrence_count), 2) as avg_recurrence
FROM behavioral_patterns
GROUP BY traffic_classification
ORDER BY traffic_classification;
```

**Target**: >= 1000 total observations across all classifications

---

### 2. H1: Separability (Pattern Distinctiveness)

```sql
-- Check for feature overlap between classifications
WITH feature_stats AS (
  SELECT
    traffic_classification,
    (feature_vector->>'platform_category')::text as platform,
    (feature_vector->>'is_mobile')::boolean as is_mobile,
    (feature_vector->>'header_count')::int as header_count,
    COUNT(*) as pattern_count
  FROM behavioral_patterns
  GROUP BY traffic_classification, platform, is_mobile, header_count
)
SELECT
  platform,
  is_mobile,
  header_count,
  COUNT(DISTINCT traffic_classification) as classification_count,
  STRING_AGG(traffic_classification, ', ') as classifications
FROM feature_stats
GROUP BY platform, is_mobile, header_count
HAVING COUNT(DISTINCT traffic_classification) > 1
ORDER BY classification_count DESC
LIMIT 20;
```

**Pass Criteria**: < 15% of patterns appear in multiple classifications
**Interpretation**: Lower overlap = better separability

---

### 3. H2: Recurrence (Attack Pattern Repetition)

```sql
SELECT
  traffic_classification,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY occurrence_count) as median_recurrence,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY occurrence_count) as p75_recurrence,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY occurrence_count) as p90_recurrence,
  MAX(occurrence_count) as max_recurrence
FROM behavioral_patterns
WHERE traffic_classification = 'blocked'
GROUP BY traffic_classification;
```

**Pass Criteria**: Median recurrence for 'blocked' >= 5x
**Interpretation**: Higher recurrence = patterns are genuinely repetitive

---

### 4. H3: Temporal Stability

```sql
SELECT
  traffic_classification,
  AVG(EXTRACT(EPOCH FROM (last_seen - first_seen))/3600) as avg_lifespan_hours,
  COUNT(CASE WHEN last_seen - first_seen > INTERVAL '24 hours' THEN 1 END) as patterns_lasting_1day,
  COUNT(CASE WHEN last_seen - first_seen > INTERVAL '7 days' THEN 1 END) as patterns_lasting_7days
FROM behavioral_patterns
GROUP BY traffic_classification
ORDER BY traffic_classification;
```

**Pass Criteria**: >= 30% of 'blocked' patterns persist >= 24 hours
**Interpretation**: Persistent patterns indicate stable attack signatures

---

### 5. Top Recurrent Patterns (Blocked Traffic)

```sql
SELECT
  pattern_hash,
  occurrence_count,
  feature_vector->>'platform_category' as platform,
  feature_vector->>'is_mobile' as is_mobile,
  feature_vector->>'header_count' as headers,
  feature_vector->>'bypass_param_present' as has_bypass,
  first_seen,
  last_seen,
  EXTRACT(EPOCH FROM (last_seen - first_seen))/3600 as lifespan_hours
FROM behavioral_patterns
WHERE traffic_classification = 'blocked'
ORDER BY occurrence_count DESC
LIMIT 20;
```

**Use**: Identify most common attack patterns for further investigation

---

## Decision Framework

### If All Hypotheses Pass

✅ **H1**: < 15% overlap (patterns are distinct)
✅ **H2**: Median recurrence >= 5x (patterns repeat)
✅ **H3**: >= 30% patterns last >= 24h (patterns are stable)

**Next Step**: Consider light adaptive response (rate limiting only)
**Document**: What patterns are most discriminative? Which features matter most?

---

### If Any Hypothesis Fails

❌ **High Overlap** (H1 fails)
- **Cause**: Features not discriminative enough
- **Action**: Add more behavioral signals OR abandon approach

❌ **Low Recurrence** (H2 fails)
- **Cause**: Attack patterns are too diverse / one-shot
- **Action**: Pattern-based defense not viable, stick to rule-based

❌ **Low Stability** (H3 fails)
- **Cause**: Patterns change too quickly
- **Action**: Shorten observation window OR abandon approach

---

## Anti-Patterns to Avoid

🚫 **DO NOT** trust patterns before validation
🚫 **DO NOT** build dashboards before confirming value
🚫 **DO NOT** implement adaptive responses without data
🚫 **DO NOT** assume patterns will be useful
🚫 **DO NOT** overfocus on implementation before proof

---

## Success Metrics

**Minimal Viable Validation**:
1. >= 1000 observations collected
2. Clear answer to: Do patterns separate? (H1)
3. Clear answer to: Do patterns repeat? (H2)
4. Clear answer to: Do patterns persist? (H3)

**Output Document** (after analysis):
```
## Pattern Analysis Results

### What the data confirmed:
- [List findings that support hypotheses]

### What the data did NOT confirm:
- [List findings that refute hypotheses]

### Where our assumptions were wrong:
- [List surprises or unexpected patterns]

### Recommendation:
- [Proceed / Pivot / Abandon] with reasoning
```

---

## Timeline

**Week 1-2**: Silent collection (this phase)
**Week 3**: Run queries, analyze results
**Week 3**: Write findings document
**Week 3**: Decide: proceed, pivot, or abandon

**No work happens in Week 3 until data is analyzed.**

---

## Contact with Reality

This system makes ZERO assumptions about pattern utility.
The only truth is in the data after 7-14 days.
Everything else is hypothesis waiting to be tested.

**"Assumptions are the real attack surface."**
