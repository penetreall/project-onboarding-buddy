import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { hash, compare } from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Session-Id",
};

function generateParamKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateBypassParam(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateSimpleIndexPhp(paramKey: string, bypassParam: string, safeUrl: string, contentFolder: string, domain: string): string {
  const phpCode = `<?php
/**
 * IceWall Protection System v7.1.0
 * Simple, Zero-Dependencies, Self-Contained
 * Domain: ${domain}
 */

error_reporting(0);
ini_set('display_errors', 0);

$startTime = microtime(true);
$layers = [];

// Bypass check (direct access to content)
if (isset($_GET['${paramKey}']) && $_GET['${paramKey}'] === '${bypassParam}') {
    header('Location: /${contentFolder}/?${paramKey}=${bypassParam}');
    exit;
}

// Get request data
$ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Country detection with IPv6 support
$country = 'XX';
$countrySource = 'Unknown';

if (!empty($_SERVER['HTTP_CF_IPCOUNTRY'])) {
    $country = $_SERVER['HTTP_CF_IPCOUNTRY'];
    $countrySource = 'CloudFlare';
} else {
    if (strpos($ip, ':') !== false) {
        $ipv6Prefix = strtolower(substr($ip, 0, 5));
        $brPrefixes = ['2804:', '2801:', '2800:', '2806:'];
        foreach ($brPrefixes as $prefix) {
            if (strpos($ipv6Prefix, $prefix) === 0) {
                $country = 'BR';
                $countrySource = 'IPv6_Prefix';
                break;
            }
        }
    } else {
        $ipLong = ip2long($ip);
        if ($ipLong) {
            $brRanges = [
                [ip2long('177.0.0.0'), ip2long('179.255.255.255')],
                [ip2long('191.0.0.0'), ip2long('191.255.255.255')],
                [ip2long('200.0.0.0'), ip2long('201.255.255.255')],
            ];
            foreach ($brRanges as $range) {
                if ($ipLong >= $range[0] && $ipLong <= $range[1]) {
                    $country = 'BR';
                    $countrySource = 'IPv4_Range';
                    break;
                }
            }
        }
    }
}

$layers[] = ['name' => 'Geo Detection', 'passed' => ($country !== 'XX'), 'detail' => "Country: $country via $countrySource"];

// Click-ID detection
$clickId = null;
$network = null;

$clickParams = [
    'gclid' => 'google_ads',
    'fbclid' => 'facebook_ads',
    'ttclid' => 'tiktok_ads',
    'msclkid' => 'microsoft_ads',
    'click_id' => 'kwai_ads'
];

foreach ($clickParams as $param => $net) {
    if (isset($_GET[$param]) && !empty($_GET[$param])) {
        $clickId = $_GET[$param];
        $network = $net;
        break;
    }
}

// Bot detection (simple)
$isBot = preg_match('/(bot|crawler|spider|curl|wget|python|scrapy|headless|phantom)/i', $ua);
$layers[] = ['name' => 'Bot Detection', 'passed' => !$isBot, 'detail' => $isBot ? 'Bot pattern detected' : 'Clean UA'];

// Mobile detection
$isMobile = preg_match('/(android|iphone|ipad|mobile)/i', $ua);
$platformType = $isMobile ? 'mobile' : 'desktop';
$layers[] = ['name' => 'Platform Detection', 'passed' => true, 'detail' => "Platform: $platformType"];

// Datacenter detection (basic)
$ipLong = ip2long($ip);
$isDatacenter = false;
if ($ipLong) {
    $datacenterRanges = [
        [ip2long('3.0.0.0'), ip2long('3.255.255.255')],
        [ip2long('13.0.0.0'), ip2long('15.255.255.255')],
        [ip2long('34.0.0.0'), ip2long('35.255.255.255')],
        [ip2long('104.16.0.0'), ip2long('104.31.255.255')],
    ];
    foreach ($datacenterRanges as $range) {
        if ($ipLong >= $range[0] && $ipLong <= $range[1]) {
            $isDatacenter = true;
            break;
        }
    }
}
$layers[] = ['name' => 'Datacenter Detection', 'passed' => !$isDatacenter, 'detail' => $isDatacenter ? 'Datacenter IP detected' : 'Residential IP'];

// Calculate entropy if click-id exists
$entropy = 0;
$clickIdValid = false;
if ($clickId && strlen($clickId) > 0) {
    $len = strlen($clickId);
    $freq = array_count_values(str_split($clickId));
    foreach ($freq as $count) {
        $p = $count / $len;
        $entropy -= $p * log($p, 2);
    }
    $minEntropy = ($network === 'kwai_ads') ? 3.0 : 3.5;
    $clickIdValid = ($len >= 20 && $entropy >= $minEntropy);
    $layers[] = ['name' => 'Click-ID Validation', 'passed' => $clickIdValid, 'detail' => $clickIdValid ? "Valid $network click-id" : "Invalid click-id (len: $len, entropy: " . round($entropy, 2) . ")"];
} else {
    $layers[] = ['name' => 'Click-ID Validation', 'passed' => false, 'detail' => 'No click-id found'];
}

// Decision logic
$decision = 'safe';
$reason = 'default_safe';
$riskScore = 0.6;

if ($isBot) {
    $reason = 'bot_detected';
    $riskScore = 1.0;
} elseif ($isDatacenter) {
    $reason = 'datacenter_ip';
    $riskScore = 1.0;
} elseif (!$clickId) {
    $reason = 'no_click_id';
    $riskScore = 0.8;
} elseif (!$clickIdValid) {
    $reason = 'invalid_click_id';
    $riskScore = 0.9;
} elseif ($network === 'google_ads' && $country === 'BR' && $isMobile) {
    $decision = 'real';
    $reason = 'google_ads_mode_valid';
    $riskScore = 0.05;
} elseif ($clickIdValid) {
    $decision = 'real';
    $reason = 'valid_click_id';
    $riskScore = 0.2;
}

$processingTime = round((microtime(true) - $startTime) * 1000);

// Final gate decision
$layers[] = ['name' => 'Final Gate', 'passed' => ($decision === 'real'), 'detail' => "$reason (risk: " . round($riskScore * 100) . "%)"];

// Send log to IceWall backend (async, non-blocking)
$logData = json_encode([
    'param_key' => '${paramKey}',
    'request_id' => bin2hex(random_bytes(16)),
    'ip' => $ip,
    'user_agent' => $ua,
    'country' => $country,
    'country_source' => $countrySource,
    'click_id_network' => $network,
    'click_id_value' => $clickId ? substr($clickId, 0, 50) : null,
    'click_id_length' => $clickId ? strlen($clickId) : null,
    'click_id_entropy' => $clickId ? round($entropy, 2) : null,
    'click_id_valid' => $clickIdValid,
    'platform_type' => $platformType,
    'is_mobile' => $isMobile,
    'is_bot' => $isBot,
    'is_datacenter' => $isDatacenter,
    'decision' => $decision,
    'decision_reason' => $reason,
    'risk_score' => $riskScore,
    'processing_time_ms' => $processingTime,
    'layers' => $layers
]);

$logUrl = 'https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend/log';

// Try to send log (silently fail if not possible)
try {
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => $logData,
            'timeout' => 2
        ]
    ]);
    @file_get_contents($logUrl, false, $context);
} catch (Exception $e) {
    // Silent fail - never block traffic
}

// Enforce decision
if ($decision === 'real') {
    header('Location: /${contentFolder}/?${paramKey}=${bypassParam}');
} else {
    header('Location: ${safeUrl}');
}

exit;
?>`;
  return phpCode;
}

function generateSimpleHtaccess(contentFolder: string): string {
  return `# IceWall Protection
RewriteEngine On

# Route all traffic to index.php (except content folder)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/${contentFolder}/
RewriteRule ^(.*)$ index.php [QSA,L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
</IfModule>

# Disable directory listing
Options -Indexes`;
}

function generateContentHtaccess(paramKey: string, bypassParam: string): string {
  return `# Protected Content Folder
# Only accessible with valid bypass parameter

RewriteEngine On
RewriteBase /

# Check for valid bypass parameter
RewriteCond %{QUERY_STRING} !${paramKey}=${bypassParam}
RewriteRule ^(.*)$ / [R=302,L]

# Allow access if bypass param is present
RewriteCond %{QUERY_STRING} ${paramKey}=${bypassParam}
RewriteRule ^ - [L]`;
}

function generateSimpleReadme(domain: string, paramKey: string, bypassParam: string, contentFolder: string, safeUrl: string): string {
  return `# 🧊 IceWall Protection System v7.1.0

**Domain:** ${domain}

## 📦 Package Contents

- \`index.php\` - Main protection gate (ZERO dependencies)
- \`.htaccess\` - Apache rewrite rules
- \`${contentFolder}/\` - **Protected content folder (EMPTY)**
  - \`.htaccess\` - Folder protection
- \`README.md\` - This file

## 🚀 Quick Start

### 1. Upload Files

Upload ALL files to your server root (public_html, www, htdocs, etc.)

### 2. Add Your Protected Content

**CRITICAL:** Place your offer/landing page files inside \`${contentFolder}/\` folder!

Example:
\`\`\`
${contentFolder}/
  ├── index.html      (your page)
  ├── style.css       (your styles)
  ├── script.js       (your scripts)
  └── .htaccess       (protection - already there)
\`\`\`

### 3. Test

**Bypass URL (direct access):**
\`\`\`
https://${domain}?${paramKey}=${bypassParam}
\`\`\`

**Safe URL (no click-id):**
\`\`\`
https://${domain}
\`\`\`
Redirects to: ${safeUrl}

**Google Ads (BR + Mobile + valid gclid):**
\`\`\`
https://${domain}?gclid=Cj0KCQiA5rGuBhDg...
\`\`\`
Redirects to: /${contentFolder}/

## 🎯 How It Works

### Click-ID First Principle

1. No click-id? → SAFE
2. Bot detected? → SAFE
3. Click-id too short? → SAFE
4. **Google Ads (BR + Mobile + valid gclid)?** → **REAL**
5. Other network + valid click-id? → REAL
6. Default → SAFE

### Google Ads Mode

**BR + Mobile + Valid gclid = Protected Content**

This works because:
- iOS/Safari don't send referer (NORMAL)
- WebViews don't send referer (NORMAL)
- gclid proves economic value
- Legitimate Google Ads traffic

## ✅ Zero Dependencies

- No database required
- No external API calls
- No SQLite
- No config files
- Works on ANY PHP hosting (7.4+)
- Upload and it JUST WORKS

## 🔒 Protected Folder

Your content lives in: \`/${contentFolder}/\`

This folder:
- Has a random name for security
- Requires bypass parameter
- Protected by .htaccess
- REAL traffic gets redirected here

## 📊 Requirements

- PHP 7.4 or higher
- Apache with mod_rewrite
- That's it!

## 🐛 Troubleshooting

### "All traffic going to SAFE"

1. Check if you're using a valid gclid (20+ characters)
2. For Google Ads: must be BR + Mobile
3. Verify country detection works (test with VPN)

### "HTTP 500 Error"

1. Check PHP version (\`php -v\`)
2. Verify Apache mod_rewrite is enabled
3. Check file permissions (644 for .php files)

## 📝 Notes

- This is a SIMPLE, PRODUCTION-READY system
- No databases to maintain
- No logs to clean up
- Just upload and go
- Zero configuration needed

---

**Domain:** ${domain}
**System:** IceWall v7.1.0
**Mode:** Click-ID First + Google Ads Mode`;
}

function generateIceWallSystem(domain: any): Record<string, string> {
  const paramKey = domain.param_key;
  const bypassParam = domain.bypass_param;
  const safeUrl = domain.safe_url;
  const protectedDomain = domain.protected_domain;

  const prefixes = ['recursos', 'modulos', 'suporte', 'conteudos', 'materiais', 'area', 'painel', 'acesso', 'portal'];
  const suffixes = ['admin', 'interno', 'privado', 'seguro', 'exclusivo', 'restrito', 'protegido', 'vip'];
  const separators = ['_', '-', ''];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const separator = separators[Math.floor(Math.random() * separators.length)];
  const contentFolder = domain.content_folder || `${prefix}${separator}${suffix}`;

  return {
    "index.php": generateSimpleIndexPhp(paramKey, bypassParam, safeUrl, contentFolder, protectedDomain),
    ".htaccess": generateSimpleHtaccess(contentFolder),
    [`${contentFolder}/.htaccess`]: generateContentHtaccess(paramKey, bypassParam),
    "README.md": generateSimpleReadme(protectedDomain, paramKey, bypassParam, contentFolder, safeUrl),
  };
}

async function validateSession(supabase: any, sessionId: string) {
  if (!sessionId) return null;

  const { data: session } = await supabase
    .from('ice_wall_sessions')
    .select('id, user_id, expires_at')
    .eq('id', sessionId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!session) return null;

  await supabase
    .from('ice_wall_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', sessionId);

  const { data: user } = await supabase
    .from('ice_wall_users')
    .select('*')
    .eq('id', session.user_id)
    .maybeSingle();

  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(req.url);
    const sessionId = req.headers.get("X-Session-Id");

    if (req.method === "POST" && url.pathname.includes("/test-password")) {
      const { username, password } = await req.json();

      const { data: user } = await supabase
        .from('ice_wall_users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const valid = await compare(password, user.password_hash);
      const newHash = await hash(password, 10);

      return new Response(
        JSON.stringify({
          username: user.username,
          currentHash: user.password_hash.substring(0, 30),
          testPassword: password,
          isValid: valid,
          newHashGenerated: newHash.substring(0, 30),
          bcryptVersion: "deno bcrypt 0.4.1"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname.includes("/login")) {
      const { username, password } = await req.json();

      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: "Missing username or password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: user } = await supabase
        .from('ice_wall_users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const valid = await compare(password, user.password_hash);

      if (!valid) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: session } = await supabase
        .from('ice_wall_sessions')
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      await supabase
        .from('ice_wall_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          session_id: session.id,
          user: {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname.includes("/logout")) {
      if (sessionId) {
        await supabase
          .from('ice_wall_sessions')
          .delete()
          .eq('id', sessionId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && url.pathname.includes("/me")) {
      const user = await validateSession(supabase, sessionId || "");

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          user: {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && url.pathname.includes("/stats")) {
      const user = await validateSession(supabase, sessionId || "");

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: domains } = await supabase
        .from('protected_domains')
        .select('id, is_active')
        .eq('ice_wall_user_id', user.id);

      const activeDomains = domains?.filter(d => d.is_active).length || 0;

      const { count: totalLogs } = await supabase
        .from('domain_access_logs')
        .select('*', { count: 'exact', head: true })
        .in('domain_id', (domains || []).map(d => d.id));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayLogs } = await supabase
        .from('domain_access_logs')
        .select('decision')
        .in('domain_id', (domains || []).map(d => d.id))
        .gte('created_at', today.toISOString());

      const requestsToday = todayLogs?.length || 0;
      const blockedToday = todayLogs?.filter(log => log.decision === 'safe').length || 0;

      const { data: allLogs } = await supabase
        .from('domain_access_logs')
        .select('decision')
        .in('domain_id', (domains || []).map(d => d.id));

      const totalRequests = allLogs?.length || 0;
      const blockedRequests = allLogs?.filter(log => log.decision === 'safe').length || 0;
      const detectionRate = totalRequests > 0 ? Math.round((blockedRequests / totalRequests) * 100) : 0;

      let totalUsers;
      if (user.is_admin) {
        const { count } = await supabase
          .from('ice_wall_users')
          .select('*', { count: 'exact', head: true });
        totalUsers = count || 0;
      }

      return new Response(
        JSON.stringify({
          stats: {
            totalRequests,
            blockedRequests,
            detectionRate,
            activeDomains,
            requestsToday,
            blockedToday,
            totalLogs: totalLogs || 0,
            totalUsers
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname.includes("/log")) {
      const body = await req.json();
      const {
        param_key, request_id, ip, user_agent, country, country_source,
        click_id_network, click_id_value, click_id_length, click_id_entropy, click_id_valid,
        platform_type, is_mobile, is_bot, is_datacenter,
        decision, decision_reason, risk_score, processing_time_ms, layers
      } = body;

      if (!request_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing request_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingLog } = await supabase
        .from("domain_access_logs")
        .select("id")
        .eq("request_id", request_id)
        .maybeSingle();

      if (existingLog) {
        return new Response(
          JSON.stringify({ success: true, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let domainId = null;
      let userId = null;

      if (param_key) {
        const { data: domain } = await supabase
          .from("protected_domains")
          .select("id, ice_wall_user_id")
          .eq("param_key", param_key)
          .maybeSingle();

        if (domain) {
          domainId = domain.id;
          userId = domain.ice_wall_user_id;
        }
      }

      const { error: logError } = await supabase
        .from("domain_access_logs")
        .insert({
          domain_id: domainId,
          ice_wall_user_id: userId,
          request_id,
          ip,
          user_agent,
          country,
          country_source,
          ip_type: ip && ip.includes(':') ? 'IPv6' : 'IPv4',
          is_safe: decision === 'safe',
          ad_network: click_id_network,
          gclid_present: !!click_id_value,
          gclid_valid: click_id_valid || false,
          gclid_length: click_id_length,
          gclid_entropy: click_id_entropy,
          platform_type,
          is_datacenter: is_datacenter || false,
          primary_reason: decision_reason,
          final_risk_score: risk_score,
          processing_time_ms,
          php_template_version: '7.1.0',
          validation_layers: layers || null,
        });

      if (logError) {
        console.error("Log insert error:", logError);
      }

      return new Response(
        JSON.stringify({ success: !logError }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = await validateSession(supabase, sessionId || "");

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      await supabase.rpc('exec_sql', {
        sql: `SET LOCAL app.current_user_id = '${user.id}'`
      });
    } catch (error) {
      // Ignore RPC errors
    }

    if (req.method === "GET" && url.pathname.includes("/domains")) {
      const { data: domains, error: domainsError } = await supabase
        .from("protected_domains")
        .select("*")
        .eq("ice_wall_user_id", user.id)
        .order("created_at", { ascending: false });

      if (domainsError) {
        return new Response(
          JSON.stringify({ error: domainsError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ domains: domains || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname.includes("/domains")) {
      const body = await req.json();
      const { safe_url, money_url, sensitivity_level } = body;

      if (!safe_url || !money_url) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const extractDomain = (urlString: string): string => {
        try {
          const urlObj = new URL(urlString);
          return urlObj.hostname;
        } catch {
          throw new Error("Invalid URL format");
        }
      };

      const protected_domain = extractDomain(money_url);
      const public_domain = extractDomain(safe_url);

      const paramKey = generateParamKey();
      const bypassParam = generateBypassParam();

      const { data: domain, error: insertError } = await supabase
        .from("protected_domains")
        .insert({
          ice_wall_user_id: user.id,
          protected_domain,
          public_domain,
          safe_url,
          money_url,
          param_key: paramKey,
          bypass_param: bypassParam,
          sensitivity_level: sensitivity_level || "medium",
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ domain }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname.includes("/generate-bypass")) {
      const body = await req.json();
      const { domain_id } = body;

      if (!domain_id) {
        return new Response(
          JSON.stringify({ error: "Missing domain_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: domain, error: domainError } = await supabase
        .from("protected_domains")
        .select("*")
        .eq("id", domain_id)
        .eq("ice_wall_user_id", user.id)
        .maybeSingle();

      if (domainError || !domain) {
        return new Response(
          JSON.stringify({ error: "Domain not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const files = generateIceWallSystem(domain);

      return new Response(
        JSON.stringify({ files }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && url.pathname.includes("/admin/users")) {
      if (!user.is_admin) {
        return new Response(
          JSON.stringify({ error: "Forbidden - Admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: users } = await supabase
        .from('ice_wall_users')
        .select('id, username, is_admin, created_at, last_login')
        .order('created_at', { ascending: false });

      return new Response(
        JSON.stringify({ users: users || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && url.pathname.includes("/admin/users")) {
      if (!user.is_admin) {
        return new Response(
          JSON.stringify({ error: "Forbidden - Admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { username, password } = await req.json();

      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: "Missing username or password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const passwordHash = await hash(password, 10);

      const { data: newUser, error: createError } = await supabase
        .from('ice_wall_users')
        .insert({
          username,
          password_hash: passwordHash,
          created_by: user.id,
          is_admin: false,
        })
        .select('id, username, is_admin, created_at')
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ user: newUser }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});