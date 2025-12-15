<?php
// IceWall Debug - Diagnóstico de Integração
@ini_set('display_errors', '1');
@error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

echo "=== ICEWALL DEBUG v6.0 ===\n\n";

// 1. Verificar cURL
echo "1. CURL: ";
if (function_exists('curl_init')) {
    echo "✓ Instalado\n";
} else {
    echo "✗ NÃO INSTALADO - FATAL!\n";
    exit;
}

// 2. Configuração
$safe = 'https://x.ai';
$key = '_83cf56fe6b4d';
$enc = 'aHR0cHM6Ly9vYW1rdGNib2hxc3plcWJoaWxocS5zdXBhYmFzZS5jby9mdW5jdGlvbnMvdjEvaWNlLXdhbGwtYmFja2VuZC92YWxpZGF0ZVhY';
$url = substr(base64_decode($enc), 0, -2);

echo "\n2. CONFIG:\n";
echo "   URL Backend: $url\n";
echo "   Param Key: $key\n";

// 3. Capturar dados
function getIP() {
    if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    if (isset($_SERVER['REMOTE_ADDR'])) return $_SERVER['REMOTE_ADDR'];
    return 'unknown';
}

$ip = getIP();
$ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown';
$gclid = isset($_GET['gclid']) ? $_GET['gclid'] : null;
$referrer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : null;

$country = 'UNKNOWN';
$country_source = 'NONE';
if (isset($_SERVER['HTTP_CF_IPCOUNTRY'])) {
    $country = $_SERVER['HTTP_CF_IPCOUNTRY'];
    $country_source = 'CF-IPCOUNTRY';
}

echo "\n3. DADOS CAPTURADOS:\n";
echo "   IP: $ip\n";
echo "   Country: $country (source: $country_source)\n";
echo "   User-Agent: " . substr($ua, 0, 60) . "...\n";
echo "   GCLID: " . ($gclid ? substr($gclid, 0, 20) . "..." : "não fornecido") . "\n";
echo "   Referrer: " . ($referrer ? $referrer : "não fornecido") . "\n";

// 4. Preparar payload
$payload = [
    'param_key' => $key,
    'ip' => $ip,
    'user_agent' => $ua,
    'headers' => getallheaders(),
    'country' => $country,
    'country_source' => $country_source,
    'gclid' => $gclid,
    'referrer' => $referrer
];

$data = json_encode($payload);

echo "\n4. PAYLOAD (primeiros 200 chars):\n";
echo "   " . substr($data, 0, 200) . "...\n";

// 5. Fazer requisição
echo "\n5. FAZENDO REQUISIÇÃO...\n";
$start = microtime(true);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
$info = curl_getinfo($ch);
curl_close($ch);

$duration = round((microtime(true) - $start) * 1000);

echo "   Status: $code\n";
echo "   Tempo: {$duration}ms\n";
echo "   Erro cURL: " . ($error ? $error : "nenhum") . "\n";

if ($code != 200) {
    echo "\n✗ FALHA: HTTP $code\n";
    echo "Resposta: $res\n";
    exit;
}

if (empty($res)) {
    echo "\n✗ FALHA: Resposta vazia\n";
    exit;
}

// 6. Decodificar resposta
echo "\n6. RESPOSTA DO BACKEND:\n";
$r = json_decode($res, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "✗ ERRO JSON: " . json_last_error_msg() . "\n";
    echo "Resposta raw: $res\n";
    exit;
}

echo "   Decision: " . ($r['decision'] ?? 'N/A') . "\n";
echo "   Platform: " . ($r['platform'] ?? 'N/A') . "\n";
echo "   Confidence: " . ($r['confidence'] ?? 'N/A') . "\n";
echo "   Gate Result: " . ($r['detection']['gate_result'] ?? 'N/A') . "\n";
echo "   Reason: " . ($r['detection']['reason'] ?? 'N/A') . "\n";

// 7. Validações
echo "\n7. VALIDAÇÕES:\n";

$checks = [
    'decision presente' => isset($r['decision']),
    'platform presente' => isset($r['platform']),
    'confidence presente' => isset($r['confidence']),
    'detection presente' => isset($r['detection']) && !empty($r['detection']),
];

foreach ($checks as $check => $result) {
    echo "   " . ($result ? "✓" : "✗") . " $check\n";
}

// 8. Decisão final
echo "\n8. DECISÃO FINAL:\n";
if ($r['decision'] === 'real') {
    echo "   REAL - Verificando condições adicionais:\n";
    echo "   " . ($r['platform'] === 'mobile' ? "✓" : "✗") . " Platform mobile\n";
    echo "   " . ($country === 'BR' ? "✓" : "✗") . " Country BR\n";
    echo "   " . (!empty($gclid) ? "✓" : "✗") . " GCLID presente\n";
    echo "   " . (isset($r['detection']['gate_result']) && $r['detection']['gate_result'] === 'PASS' ? "✓" : "✗") . " Gate PASS\n";

    if ($r['platform'] === 'mobile' && $country === 'BR' && !empty($gclid) &&
        isset($r['detection']['gate_result']) && $r['detection']['gate_result'] === 'PASS') {
        echo "\n✓ APROVADO - Redirecionaria para: /recursos/\n";
    } else {
        echo "\n✗ REJEITADO - Redirecionaria para: $safe\n";
    }
} else {
    echo "   SAFE - Redirecionaria para: $safe\n";
}

echo "\n=== FIM DEBUG ===\n";
echo "\nSe você viu isso, o PHP está funcionando!\n";
echo "Se não há logs no dashboard, pode ser:\n";
echo "1. O edge function não está inserindo (improvável - já testamos)\n";
echo "2. Você não está acessando com os parâmetros corretos\n";
echo "3. Há um problema de timezone/cache no dashboard\n";
?>
