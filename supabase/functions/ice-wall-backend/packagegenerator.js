const archiver = require('archiver');
const crypto = require('crypto');
const { Readable } = require('stream');

async function generateBypassPackage({ publicDomain, protectedDomain, sensitivityLevel }) {
  
  // ========================================
  // GERAÇÃO DE CHAVE ÚNICA POR DEPLOYMENT
  // ========================================
  const deploymentKey = crypto.randomBytes(6).toString('base64url');
  const deploymentHash = crypto.createHash('sha256').update(deploymentKey).digest('hex').substring(0, 16);
  const deploymentId = Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  const paramName = '_' + crypto.randomBytes(3).toString('hex');
  
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('end', () => {
      resolve({
        zipBuffer: Buffer.concat(chunks),
        deploymentKey: deploymentKey,
        deploymentHash: deploymentHash,
        deploymentId: deploymentId,
        paramName: paramName,
        apiUrl: `${protectedDomain.startsWith('http') ? protectedDomain : 'https://' + protectedDomain}/api/logs.php`
      });
    });
    archive.on('error', reject);

    // ========================================
    // ARQUIVO 1: index.php (Entry Point)
    // ========================================
    const indexPhp = `<?php
/**
 * IceWall Protection System - Invisible Mode
 * Dominio Protegido: ${protectedDomain}
 * Dominio Publico: ${publicDomain}
 * Deployment: ${deploymentId}
 * Parametro Interno: ${paramName}
 * Gerado em: ${new Date().toISOString()}
 */

error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/core/engine.php';

$engine = new IceWallEngine();

if (!isset($_GET[$engine->getParamName()])) {
    http_response_code(200);
    $engine->serveGhost404('${publicDomain}');
    exit;
}

$decision = $engine->analyze();

if ($decision['serve'] === 'protected') {
    $engine->proxyRequest('${protectedDomain}');
} else {
    $engine->proxyRequest('${publicDomain}');
}

$engine->log($decision);
?>`;

    archive.append(indexPhp, { name: 'index.php' });

    // ========================================
    // ARQUIVO 2: core/engine.php (Motor + Banco)
    // ========================================
    const enginePhp = `<?php
class IceWallEngine {

    private $confidence = 0;
    private $paramName = '${paramName}';
    private $deploymentHash = '${deploymentHash}';
    private $deploymentId = '${deploymentId}';
    private $db = null;
    private $goldenOrder = 'Host|Connection|sec-ch-ua|sec-ch-ua-mobile|sec-ch-ua-platform|Upgrade-Insecure-Requests|User-Agent|Accept|Sec-Fetch-Site|Sec-Fetch-Mode|Sec-Fetch-User|Sec-Fetch-Dest|Referer|Accept-Encoding|Accept-Language|Cookie';
    private $replayCache = [];
    
    public function __construct() {
        $this->initDatabase();
    }
    
    private function initDatabase() {
        $dbPath = __DIR__ . '/../logs/icewall.db';
        
        try {
            $this->db = new PDO('sqlite:' . $dbPath);
            $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            $this->db->exec("
                CREATE TABLE IF NOT EXISTS access_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    deployment_id TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    country TEXT,
                    decision TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    confidence REAL,
                    user_agent TEXT,
                    has_cookie TEXT,
                    has_param TEXT,
                    request_uri TEXT,
                    referer TEXT
                );
                
                CREATE INDEX IF NOT EXISTS idx_timestamp ON access_logs(timestamp);
                CREATE INDEX IF NOT EXISTS idx_deployment ON access_logs(deployment_id);
                CREATE INDEX IF NOT EXISTS idx_decision ON access_logs(decision);
                
                CREATE TABLE IF NOT EXISTS deployments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    deployment_id TEXT UNIQUE NOT NULL,
                    param_name TEXT NOT NULL,
                    deployment_hash TEXT NOT NULL,
                    public_domain TEXT NOT NULL,
                    protected_domain TEXT NOT NULL,
                    sensitivity_level TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    total_requests INTEGER DEFAULT 0,
                    verified_humans INTEGER DEFAULT 0,
                    blocked_bots INTEGER DEFAULT 0
                );
                
                CREATE TABLE IF NOT EXISTS blocked_ips (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ip_address TEXT UNIQUE NOT NULL,
                    country TEXT,
                    reason TEXT,
                    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    attempts INTEGER DEFAULT 1
                );
            ");
            
            $this->registerDeployment();
            
        } catch (PDOException $e) {
            error_log('Database error: ' . $e->getMessage());
            $this->db = null;
        }
    }
    
    private function registerDeployment() {
        if (!$this->db) return;
        
        try {
            $stmt = $this->db->prepare("
                INSERT OR IGNORE INTO deployments 
                (deployment_id, param_name, deployment_hash, public_domain, protected_domain, sensitivity_level)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $this->deploymentId,
                $this->paramName,
                $this->deploymentHash,
                '${publicDomain}',
                '${protectedDomain}',
                '${sensitivityLevel}'
            ]);
        } catch (PDOException $e) {
            error_log('Deployment registration error: ' . $e->getMessage());
        }
    }
    
    public function analyze() {
        session_start();

        $clientIP = $_SERVER['REMOTE_ADDR'];

        if (isset($_SESSION['geo_lock']) && $_SESSION['geo_lock'] === 1) {
            return [
                'serve' => 'public',
                'reason' => 'geo_locked',
                'confidence' => 0.0
            ];
        }

        $country = $this->getCountry($clientIP);

        if ($country !== 'BR') {
            $_SESSION['geo_lock'] = 1;
            return [
                'serve' => 'public',
                'reason' => 'non_br_country',
                'confidence' => 0.0
            ];
        }

        $hasTrackingCookie = isset($_COOKIE['_iw_track']);

        if (!$hasTrackingCookie && !isset($_GET[$this->paramName])) {
            $this->autoInjectParam();
            exit;
        }

        if (isset($_GET[$this->paramName]) && !$hasTrackingCookie) {
            $this->setTrackingCookie($_GET[$this->paramName]);

            $cleanUrl = strtok($_SERVER['REQUEST_URI'], '?');
            header('Location: ' . $cleanUrl, true, 302);
            exit;
        }

        if (!isset($_COOKIE['_iw_track'])) {
            return [
                'serve' => 'public',
                'reason' => 'no_tracking_cookie',
                'confidence' => 0.0
            ];
        }

        if (!$this->validateTrackingCookie($_COOKIE['_iw_track'])) {
            return [
                'serve' => 'public',
                'reason' => 'invalid_tracking',
                'confidence' => 0.0
            ];
        }

        $this->confidence += 0.30;
        $this->confidence += 0.20;
        
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $botPatterns = [
            '/bot/i', '/crawl/i', '/spider/i', '/curl/i', 
            '/python/i', '/wget/i', '/java/i', '/go-http/i',
            '/headless/i', '/phantom/i', '/selenium/i'
        ];
        
        foreach ($botPatterns as $pattern) {
            if (preg_match($pattern, $ua)) {
                return [
                    'serve' => 'public',
                    'reason' => 'bot_user_agent',
                    'confidence' => $this->confidence
                ];
            }
        }
        
        $this->confidence += 0.20;
        
        $requiredHeaders = ['HTTP_ACCEPT', 'HTTP_ACCEPT_LANGUAGE'];
        
        foreach ($requiredHeaders as $header) {
            if (!isset($_SERVER[$header])) {
                return [
                    'serve' => 'public',
                    'reason' => 'missing_headers',
                    'confidence' => $this->confidence
                ];
            }
        }
        
        $this->confidence += 0.10;

        if (!isset($_COOKIE['_iw_js'])) {
            $this->injectJSChallenge();
            exit;
        }
        
        if (!$this->validateJSChallenge($_COOKIE['_iw_js'])) {
            return [
                'serve' => 'public',
                'reason' => 'js_challenge_failed',
                'confidence' => $this->confidence
            ];
        }

        $this->confidence += 0.20;

        $headerScore = $this->validateHeaderOrder();
        $this->confidence += $headerScore;

        $rwndScore = $this->checkTcpRwnd();
        $this->confidence += $rwndScore;

        if ($this->detectReplayAttack()) {
            return [
                'serve' => 'public',
                'reason' => 'replay_attack_detected',
                'confidence' => 0.0
            ];
        }

        $threshold = ${sensitivityLevel === 'low' ? '0.50' : sensitivityLevel === 'medium' ? '0.65' : sensitivityLevel === 'high' ? '0.75' : '0.85'};
        
        if ($this->confidence >= $threshold) {
            return [
                'serve' => 'protected',
                'reason' => 'verified_human',
                'confidence' => $this->confidence
            ];
        } else {
            return [
                'serve' => 'public',
                'reason' => 'low_confidence',
                'confidence' => $this->confidence
            ];
        }
    }
    
    private function autoInjectParam() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $uri = $_SERVER['REQUEST_URI'];
        
        $separator = strpos($uri, '?') !== false ? '&' : '?';
        $newUrl = $protocol . '://' . $host . $uri . $separator . $this->paramName . '=1';
        
        header('Location: ' . $newUrl, true, 302);
        exit;
    }
    
    private function setTrackingCookie($value) {
        $data = json_encode([
            'v' => $value,
            't' => time(),
            'ip' => $_SERVER['REMOTE_ADDR'],
            'ua' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 50)
        ]);
        
        $signature = hash_hmac('sha256', $data, $this->deploymentHash);
        $cookieValue = base64_encode($data) . '.' . $signature;
        
        setcookie('_iw_track', $cookieValue, [
            'expires' => time() + (30 * 86400),
            'path' => '/',
            'httponly' => true,
            'secure' => true,
            'samesite' => 'Lax'
        ]);
    }
    
    private function validateTrackingCookie($cookie) {
        $parts = explode('.', $cookie);
        if (count($parts) !== 2) return false;
        
        list($data, $signature) = $parts;
        $expectedSig = hash_hmac('sha256', $data, $this->deploymentHash);
        
        return hash_equals($expectedSig, $signature);
    }
    
    private function getCountry($ip) {
        if (in_array($ip, ['127.0.0.1', '::1', 'localhost'])) {
            return 'BR';
        }

        return $this->getCountryCode($ip);
    }
    
    private function injectJSChallenge() {
        $challenge = ['a' => rand(10, 999), 'b' => rand(10, 999), 't' => time()];
        $_SESSION['_iw_c'] = $challenge;
        
        echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Carregando...</title></head><body>';
        echo '<script>';
        echo 'const c=' . json_encode($challenge) . ';';
        echo 'const s=btoa((c.a+c.b)+navigator.userAgent.substring(0,50)+c.t);';
        echo 'document.cookie="_iw_js="+s+";path=/;max-age=3600;secure;samesite=lax";';
        echo 'setTimeout(()=>window.location.reload(),100);';
        echo '</script>';
        echo '<p style="text-align:center;margin-top:50px;font-family:Arial;color:#666;">Verificando...</p>';
        echo '</body></html>';
    }
    
    private function validateJSChallenge($cookie) {
        if (!isset($_SESSION['_iw_c'])) return false;

        $c = $_SESSION['_iw_c'];
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 50);
        $expected = base64_encode(($c['a'] + $c['b']) . $ua . $c['t']);

        return hash_equals($expected, $cookie);
    }

    private function validateHeaderOrder() {
        $headers = getallheaders();
        if (empty($headers)) return 0.0;

        $received = array_keys($headers);
        $receivedStr = implode('|', $received);

        $distance = levenshtein($receivedStr, $this->goldenOrder);

        if ($distance === 0) {
            return 0.15;
        } elseif ($distance <= 2) {
            return 0.08;
        } elseif ($distance <= 5) {
            return 0.03;
        }

        return 0.0;
    }

    private function checkTcpRwnd() {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        if (empty($ip)) return 0.0;

        $cmd = "ss -tin 2>/dev/null | grep '$ip' | head -1";
        $output = shell_exec($cmd);

        if (!$output) {
            $procNet = @file_get_contents('/proc/net/tcp');
            if ($procNet && preg_match('/\\s+([0-9A-F]+):/', $procNet, $m)) {
                $rwnd = hexdec($m[1]);
            } else {
                return 0.0;
            }
        } else {
            if (preg_match('/rcv_wnd:([0-9]+)/', $output, $m)) {
                $rwnd = (int)$m[1];
            } else {
                return 0.0;
            }
        }

        if ($rwnd === 65535) {
            return 0.10;
        } elseif ($rwnd === 131072) {
            return -0.05;
        }

        return 0.0;
    }

    private function detectReplayAttack() {
        $headers = getallheaders();
        $headerOrder = implode('|', array_keys($headers));

        $rwnd = 0;
        $cmd = "ss -tin 2>/dev/null | grep '{$_SERVER['REMOTE_ADDR']}' | head -1";
        $output = @shell_exec($cmd);
        if ($output && preg_match('/rcv_wnd:([0-9]+)/', $output, $m)) {
            $rwnd = (int)$m[1];
        }

        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $signature = hash('sha256', $headerOrder . '|' . $rwnd . '|' . $path);

        $cacheFile = __DIR__ . '/../logs/replay_cache.json';
        $cache = [];

        if (file_exists($cacheFile)) {
            $cache = json_decode(file_get_contents($cacheFile), true) ?? [];
            $now = time();

            foreach ($cache as $sig => $data) {
                if ($now - $data['time'] > 300) {
                    unset($cache[$sig]);
                }
            }
        }

        $currentIp = $_SERVER['REMOTE_ADDR'];

        if (isset($cache[$signature])) {
            $storedIp = $cache[$signature]['ip'];

            if ($storedIp !== $currentIp) {
                file_put_contents($cacheFile, json_encode($cache));
                return true;
            }
        }

        $cache[$signature] = [
            'ip' => $currentIp,
            'time' => time()
        ];

        file_put_contents($cacheFile, json_encode($cache));
        return false;
    }

    public function getParamName() {
        return $this->paramName;
    }

    public function serveGhost404($publicDomain) {
        $publicDomain = preg_replace('#^https?://#', '', $publicDomain);
        $url = 'https://' . $publicDomain . '/404';

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $content = curl_exec($ch);
        curl_close($ch);

        if ($content) {
            $content = $this->addResponsePadding($content, 'ghost404');
            echo $content;
        } else {
            echo '<!DOCTYPE html><html><head><title>404 Not Found</title></head>';
            echo '<body><h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p></body></html>';
        }
    }

    public function proxyRequest($targetDomain) {
        $targetDomain = preg_replace('#^https?://#', '', $targetDomain);
        
        $url = 'https://' . $targetDomain . $_SERVER['REQUEST_URI'];
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0');
        
        $headers = [];
        foreach (getallheaders() as $key => $value) {
            if (strtolower($key) !== 'host') {
                $headers[] = "$key: $value";
            }
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        $content = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        http_response_code($httpCode);
        header('Content-Type: ' . $contentType);

        $content = $this->addResponsePadding($content, 'proxy');
        echo $content;
    }

    private function addResponsePadding($content, $type) {
        if (empty($content) || !is_string($content)) {
            return $content;
        }

        $currentSize = strlen($content);
        $targetSize = 65536;

        if (stripos($content, '</body>') !== false) {
            $paddingSize = max(0, $targetSize - $currentSize);
            $padding = $this->generateHtmlPadding($paddingSize);

            $content = str_ireplace('</body>', $padding . '</body>', $content);
        } elseif (stripos($content, '</html>') !== false) {
            $paddingSize = max(0, $targetSize - $currentSize);
            $padding = $this->generateHtmlPadding($paddingSize);

            $content = str_ireplace('</html>', $padding . '</html>', $content);
        }

        return $content;
    }

    private function generateHtmlPadding($size) {
        if ($size <= 0) return '';

        $padding = "\n<!-- ";
        $remaining = $size - 10;

        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
        $charsLen = strlen($chars);

        for ($i = 0; $i < $remaining; $i++) {
            $padding .= $chars[random_int(0, $charsLen - 1)];
        }

        $padding .= ' -->';

        return $padding;
    }

    public function log($decision) {
        @file_put_contents(__DIR__ . '/../logs/access.log', json_encode([
            'timestamp' => date('Y-m-d H:i:s'),
            'deployment' => $this->deploymentId,
            'ip' => $_SERVER['REMOTE_ADDR'],
            'decision' => $decision['serve'],
            'reason' => $decision['reason'],
            'confidence' => $decision['confidence']
        ]) . PHP_EOL, FILE_APPEND);
        
        if (!$this->db) return;
        
        try {
            $stmt = $this->db->prepare("
                INSERT INTO access_logs 
                (deployment_id, ip_address, country, decision, reason, confidence, user_agent, has_cookie, has_param, request_uri, referer)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $geo = $this->getCountry($_SERVER['REMOTE_ADDR']);

            $stmt->execute([
                $this->deploymentId,
                $_SERVER['REMOTE_ADDR'],
                $geo ?? 'XX',
                $decision['serve'],
                $decision['reason'],
                $decision['confidence'],
                substr($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', 0, 255),
                isset($_COOKIE['_iw_track']) ? 'yes' : 'no',
                isset($_GET[$this->paramName]) ? 'yes' : 'no',
                $_SERVER['REQUEST_URI'] ?? '',
                $_SERVER['HTTP_REFERER'] ?? ''
            ]);
            
            $this->updateStats($decision);
            
            if ($decision['serve'] === 'public') {
                $this->registerBlockedIP($decision['reason']);
            }
            
        } catch (PDOException $e) {
            error_log('Log error: ' . $e->getMessage());
        }
    }
    
    private function updateStats($decision) {
        if (!$this->db) return;
        
        try {
            $column = $decision['serve'] === 'protected' ? 'verified_humans' : 'blocked_bots';
            
            $stmt = $this->db->prepare("
                UPDATE deployments 
                SET total_requests = total_requests + 1, $column = $column + 1
                WHERE deployment_id = ?
            ");
            
            $stmt->execute([$this->deploymentId]);
        } catch (PDOException $e) {}
    }
    
    private function registerBlockedIP($reason) {
        if (!$this->db) return;
        
        try {
            $geo = $this->getCountry($_SERVER['REMOTE_ADDR']);

            $stmt = $this->db->prepare("
                INSERT INTO blocked_ips (ip_address, country, reason, attempts)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(ip_address) DO UPDATE SET attempts = attempts + 1
            ");

            $stmt->execute([$_SERVER['REMOTE_ADDR'], $geo ?? 'XX', $reason]);
        } catch (PDOException $e) {}
    }
}
?>`;

    archive.append(enginePhp, { name: 'core/engine.php' });

    // ========================================
    // ARQUIVO 3: api/logs.php
    // ========================================
    const logsApi = `<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$dbPath = __DIR__ . '/../logs/icewall.db';

if (!file_exists($dbPath)) {
    die(json_encode(['error' => 'Database not found']));
}

$db = new PDO('sqlite:' . $dbPath);
$action = $_GET['action'] ?? 'stats';

switch ($action) {
    case 'stats':
        $stmt = $db->query("SELECT * FROM deployments ORDER BY created_at DESC");
        echo json_encode(['success' => true, 'deployments' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;
        
    case 'recent':
        $limit = (int)($_GET['limit'] ?? 50);
        $stmt = $db->prepare("SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT ?");
        $stmt->execute([$limit]);
        echo json_encode(['success' => true, 'logs' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;
        
    case 'blocked':
        $limit = (int)($_GET['limit'] ?? 100);
        $stmt = $db->prepare("SELECT * FROM blocked_ips ORDER BY blocked_at DESC LIMIT ?");
        $stmt->execute([$limit]);
        echo json_encode(['success' => true, 'blocked_ips' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;
        
    default:
        echo json_encode(['error' => 'Invalid action']);
}
?>`;

    archive.append(logsApi, { name: 'api/logs.php' });

    // ========================================
    // ARQUIVO 4: .htaccess
    // ========================================
    const htaccess = `<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

<FilesMatch "\\.(log|txt|db)$">
    Require all denied
</FilesMatch>`;

    archive.append(htaccess, { name: '.htaccess' });

    // ========================================
    // ARQUIVO 5: README.txt
    // ========================================
    const readme = `ICEWALL - SISTEMA COM BANCO DE DADOS

DEPLOYMENT: ${deploymentId}
PARAMETRO: ${paramName}
API: ${protectedDomain}/api/logs.php

DOMINIOS:
- Publico: ${publicDomain}
- Protegido: ${protectedDomain}

INSTALACAO:
1. Extrair na raiz
2. Criar pasta: mkdir logs && chmod 755 logs
3. Acessar: ${protectedDomain}

BANCO: logs/icewall.db (SQLite)`;

    archive.append(readme, { name: 'README.txt' });
    archive.append('', { name: 'logs/.gitkeep' });

    archive.finalize();
  });
}

module.exports = { generateBypassPackage };