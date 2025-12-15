import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
  return `# IceWall Protection System v7.1.0

**Domain:** ${domain}

## Package Contents

- \`index.php\` - Main protection gate (ZERO dependencies)
- \`.htaccess\` - Apache rewrite rules
- \`${contentFolder}/\` - **Protected content folder (EMPTY)**
  - \`.htaccess\` - Folder protection
- \`README.md\` - This file

## Quick Start

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

## How It Works

### Click-ID First Principle

1. No click-id → SAFE
2. Bot detected → SAFE
3. Click-id too short → SAFE
4. **Google Ads (BR + Mobile + valid gclid)** → **REAL**
5. Other network + valid click-id → REAL
6. Default → SAFE

### Google Ads Mode

**BR + Mobile + Valid gclid = Protected Content**

This works because:
- iOS/Safari don't send referer (NORMAL)
- WebViews don't send referer (NORMAL)
- gclid proves economic value
- Legitimate Google Ads traffic

## Zero Dependencies

- No database required
- No external API calls
- No SQLite
- No config files
- Works on ANY PHP hosting (7.4+)
- Upload and it JUST WORKS

## Protected Folder

Your content lives in: \`/${contentFolder}/\`

This folder:
- Has a random name for security
- Requires bypass parameter
- Protected by .htaccess
- REAL traffic gets redirected here

## Requirements

- PHP 7.4 or higher
- Apache with mod_rewrite
- That's it!

## Troubleshooting

### "All traffic going to SAFE"

Check:
1. Did you add content to \`${contentFolder}/\` ?
2. Is mod_rewrite enabled?
3. Does your hosting support .htaccess?

### "Bypass URL not working"

Make sure you're using the EXACT URL:
\`\`\`
https://${domain}?${paramKey}=${bypassParam}
\`\`\`

## Support

For issues or questions:
- Check logs in IceWall Dashboard
- Verify domain configuration
- Test with real Google Ads traffic

---

**Generated:** ${new Date().toLocaleString('pt-BR')}
**Version:** 7.1.0
`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const domainId = url.searchParams.get('domain_id');

    if (!domainId) {
      return new Response(
        JSON.stringify({ error: 'domain_id required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: domain, error } = await supabase
      .from('protected_domains')
      .select('*')
      .eq('id', domainId)
      .maybeSingle();

    if (error || !domain) {
      return new Response(
        JSON.stringify({ error: 'Domain not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const zip = new JSZip();

    const indexPhp = generateSimpleIndexPhp(
      domain.param_key,
      domain.bypass_param,
      domain.safe_url,
      domain.content_folder,
      domain.protected_domain
    );

    const rootHtaccess = generateSimpleHtaccess(domain.content_folder);
    const contentHtaccess = generateContentHtaccess(domain.param_key, domain.bypass_param);
    const readme = generateSimpleReadme(
      domain.protected_domain,
      domain.param_key,
      domain.bypass_param,
      domain.content_folder,
      domain.safe_url
    );

    zip.file('index.php', indexPhp);
    zip.file('.htaccess', rootHtaccess);
    zip.file('README.md', readme);

    const contentFolder = zip.folder(domain.content_folder);
    if (contentFolder) {
      contentFolder.file('.htaccess', contentHtaccess);
      contentFolder.file('PUT_YOUR_FILES_HERE.txt',
        'Place your landing page / offer files in this folder.\n\n' +
        'Example:\n' +
        '- index.html\n' +
        '- style.css\n' +
        '- script.js\n' +
        '- images/\n\n' +
        'This folder is protected and only accessible with valid traffic or bypass URL.'
      );
    }

    const zipBlob = await zip.generateAsync({ type: 'uint8array' });

    const filename = `icewall-${domain.protected_domain.replace(/[^a-z0-9]/gi, '-')}.zip`;

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error generating ZIP:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate ZIP' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});