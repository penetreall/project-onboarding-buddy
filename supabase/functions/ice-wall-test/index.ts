// Ice Wall Test Endpoint

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

class SimpleRiskEngine {
  async assess(context: any) {
    const isGoogleAds = context.clickId?.network === 'google_ads' && context.clickId?.isValid;
    const isDatacenter = context.isDatacenter || false;
    const isBotDetected = context.isBotDetected || false;

    const reasoning: string[] = [];

    reasoning.push(`Platform: ${context.platformType}`);
    reasoning.push(`Google Ads: ${isGoogleAds ? 'YES' : 'NO'}`);
    reasoning.push(`Datacenter: ${isDatacenter ? 'YES' : 'NO'}`);
    reasoning.push(`Bot: ${isBotDetected ? 'YES' : 'NO'}`);

    if (isGoogleAds && !isDatacenter && !isBotDetected) {
      reasoning.push('🔥 GOOGLE ADS MODE: DETERMINISTIC OVERRIDE');
      reasoning.push('→ gclid VALID ✓');
      reasoning.push('→ NOT datacenter ✓');
      reasoning.push('→ NOT bot ✓');
      reasoning.push('→ DECISION: REAL');

      console.log('[GOOGLE_ADS_MODE]', {
        gclidDetected: true,
        gclidValid: true,
        network: 'google_ads',
        isDatacenter,
        isBotDetected,
        decisionFinal: 'real',
        reason: 'DETERMINISTIC_OVERRIDE',
      });

      return {
        decision: 'real',
        finalRisk: 0.05,
        reasoning,
      };
    }

    if (!context.clickId || !context.clickId.hasClickId) {
      reasoning.push('NO CLICK-ID DETECTED - Cannot go to REAL');
      return {
        decision: 'safe',
        finalRisk: 1.0,
        reasoning,
      };
    }

    if (isDatacenter || isBotDetected) {
      reasoning.push('DATACENTER OR BOT DETECTED - Cannot go to REAL');
      return {
        decision: 'safe',
        finalRisk: 0.9,
        reasoning,
      };
    }

    return {
      decision: 'safe',
      finalRisk: 0.6,
      reasoning,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (url.pathname.includes("/test-google-ads-mode")) {
      console.log('[TEST_ENDPOINT] Running Google Ads Mode validation test');

      const testScenarios = [
        {
          name: "Mobile + Valid gclid → REAL",
          context: {
            ip: "191.52.123.45",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
            headers: { "user-agent": "Mozilla/5.0 (iPhone)" },
            country: "BR",
            platformType: "mobile",
            passedAllLayers: true,
            failedLayers: [],
            requestTimestamp: Date.now(),
            navigationDepth: 0,
            hasReferer: false,
            isDatacenter: false,
            isBotDetected: false,
            clickId: {
              hasClickId: true,
              isValid: true,
              network: "google_ads",
              entropy: 4.2,
              refererMatch: false,
              validationErrors: [],
            },
          },
          expectedDecision: "real",
        },
        {
          name: "UTMs without gclid → SAFE",
          context: {
            ip: "191.52.123.45",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
            headers: { "user-agent": "Mozilla/5.0 (iPhone)" },
            country: "BR",
            platformType: "mobile",
            passedAllLayers: true,
            failedLayers: [],
            requestTimestamp: Date.now(),
            navigationDepth: 0,
            hasReferer: false,
            isDatacenter: false,
            isBotDetected: false,
            clickId: {
              hasClickId: false,
              isValid: false,
              network: null,
              entropy: 0,
              refererMatch: false,
              validationErrors: [],
            },
          },
          expectedDecision: "safe",
        },
        {
          name: "Bot/Datacenter → SAFE",
          context: {
            ip: "44.192.0.0",
            userAgent: "python-requests/2.28.0",
            headers: { "user-agent": "python-requests/2.28.0" },
            country: "US",
            platformType: "desktop",
            passedAllLayers: false,
            failedLayers: ["Datacenter", "Bot Detection"],
            requestTimestamp: Date.now(),
            navigationDepth: 0,
            hasReferer: false,
            isDatacenter: true,
            isBotDetected: true,
            clickId: {
              hasClickId: true,
              isValid: true,
              network: "google_ads",
              entropy: 4.2,
              refererMatch: false,
              validationErrors: [],
            },
          },
          expectedDecision: "safe",
        },
      ];

      const results = [];

      for (const scenario of testScenarios) {
        const riskEngine = new SimpleRiskEngine();
        const assessment = await riskEngine.assess(scenario.context);

        const passed = assessment.decision === scenario.expectedDecision;

        results.push({
          name: scenario.name,
          expected: scenario.expectedDecision,
          actual: assessment.decision,
          finalRisk: assessment.finalRisk,
          passed,
          reasoning: assessment.reasoning,
        });

        console.log(`[TEST] ${scenario.name}: ${passed ? "✅ PASS" : "❌ FAIL"} (expected: ${scenario.expectedDecision}, got: ${assessment.decision})`);
      }

      const allPassed = results.every((r) => r.passed);

      return new Response(
        JSON.stringify({
          status: allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED",
          results,
          timestamp: new Date().toISOString(),
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Test endpoint ready",
        endpoint: "/test-google-ads-mode"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});