# DNS Split-Horizon com TTL 30s - Anti-Auditoria Avançada

## Conceito

Sistema de DNS que retorna **IPs diferentes** para o mesmo hostname baseado no **trust level** do visitante, com **TTL de 30 segundos** para prevenir detecção.

## Como Funciona

### Arquitetura

```
Domain: protectedsite.com
TTL: 30 seconds (mandatory!)

┌─────────────────────────────────────┐
│   DNS Authoritative Server          │
│   (Custom Logic Required)            │
└─────────────────────────────────────┘
             │
             ├─────────────────────────┐
             │                         │
    Low-Trust Request          High-Trust Request
    (First Visit)              (Passed Validation)
             │                         │
             v                         v
    IP-A: 192.168.1.10           IP-B: 192.168.1.20
    (Low-Trust Server)           (High-Trust Server)
```

### Trust Level Tracking

O DNS server precisa manter um **in-memory cache** de IPs que atingiram high-trust:

```javascript
// Pseudo-código do DNS server customizado
const highTrustIPs = new Map(); // IP -> timestamp

function resolveDNS(hostname, clientIP) {
  if (highTrustIPs.has(clientIP)) {
    const lastSeen = highTrustIPs.get(clientIP);

    // Trust expira em 24h
    if (Date.now() - lastSeen < 86400000) {
      return {
        ip: HIGH_TRUST_IP,
        ttl: 30
      };
    }
  }

  // Default: low-trust
  return {
    ip: LOW_TRUST_IP,
    ttl: 30
  };
}
```

### Callback do IceWall

Quando um usuário atinge high-trust, o IceWall notifica o DNS server:

```php
private function notifyDNSServer($clientIP) {
    $dnsApiUrl = 'http://dns-server.internal:8053/trust-callback';

    $data = [
        'client_ip' => $clientIP,
        'trust_level' => 'high',
        'timestamp' => time()
    ];

    $ch = curl_init($dnsApiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}
```

## Por Que TTL 30s?

### Previne Cache Persistente

- **TTL 300s+**: Auditor pode fazer snapshot do DNS
- **TTL 30s**: Cache expira antes de completar auditoria
- Auditor NUNCA vê ambos os IPs ao mesmo tempo

### Exemplo de Ataque Bloqueado

**Cenário: Auditor tentando comparar respostas**

```bash
# T=0: Primeira requisição (low-trust)
$ dig protectedsite.com
; ANSWER SECTION:
protectedsite.com. 30 IN A 192.168.1.10

$ curl http://192.168.1.10
# Recebe conteúdo público

# T=60s: Auditor tenta trocar IP e comparar
$ curl http://protectedsite.com -x SOCKS5://new-exit-node
# DNS retorna AINDA 192.168.1.10 (não atingiu high-trust)
# Mesmo IP, mesma resposta

# T=120s: Auditor tenta forçar DNS refresh
$ dig protectedsite.com @8.8.8.8
; ANSWER SECTION:
protectedsite.com. 30 IN A 192.168.1.10
# AINDA low-trust! Porque novo IP não passou validação

# Resultado: Auditor NUNCA consegue ver o IP high-trust
```

## Implementação - DNS Server Customizado

### Opção 1: PowerDNS + Lua Script

```lua
-- pdns-trust-resolver.lua
local trust_cache = {}

function preresolve(dq)
  local client_ip = dq.remoteaddr:toString()

  -- Checar se IP está em high-trust cache
  if trust_cache[client_ip] and
     (os.time() - trust_cache[client_ip]) < 86400 then
    -- High-trust IP
    dq:addAnswer(pdns.A, "192.168.1.20", 30)
  else
    -- Low-trust IP
    dq:addAnswer(pdns.A, "192.168.1.10", 30)
  end

  return true
end

-- API callback para atualizar trust
function update_trust(ip)
  trust_cache[ip] = os.time()
end
```

### Opção 2: Node.js DNS Server

```javascript
const dgram = require('dgram');
const dnsPacket = require('dns-packet');

const server = dgram.createSocket('udp4');
const highTrustIPs = new Map();

// API para receber callbacks do IceWall
const express = require('express');
const app = express();

app.post('/trust-callback', (req, res) => {
  const { client_ip, trust_level } = req.body;

  if (trust_level === 'high') {
    highTrustIPs.set(client_ip, Date.now());
  }

  res.json({ success: true });
});

app.listen(8053);

// DNS Server
server.on('message', (msg, rinfo) => {
  const query = dnsPacket.decode(msg);
  const clientIP = rinfo.address;

  let ip;
  if (highTrustIPs.has(clientIP)) {
    const lastSeen = highTrustIPs.get(clientIP);
    if (Date.now() - lastSeen < 86400000) {
      ip = '192.168.1.20'; // High-trust
    } else {
      ip = '192.168.1.10'; // Low-trust
    }
  } else {
    ip = '192.168.1.10'; // Low-trust
  }

  const response = dnsPacket.encode({
    type: 'response',
    id: query.id,
    questions: query.questions,
    answers: [{
      type: 'A',
      class: 'IN',
      name: query.questions[0].name,
      ttl: 30,
      data: ip
    }]
  });

  server.send(response, rinfo.port, rinfo.address);
});

server.bind(53);
```

### Opção 3: CloudFlare Workers (Recomendado)

```javascript
// CloudFlare Worker com KV storage para trust tracking
addEventListener('fetch', event => {
  event.respondWith(handleDNSQuery(event.request))
});

async function handleDNSQuery(request) {
  const clientIP = request.headers.get('CF-Connecting-IP');

  // Checar KV storage
  const trustLevel = await DNS_TRUST_KV.get(clientIP);

  const ip = (trustLevel === 'high')
    ? '192.168.1.20'
    : '192.168.1.10';

  return new Response(JSON.stringify({
    Status: 0,
    Answer: [{
      name: 'protectedsite.com',
      type: 1,
      TTL: 30,
      data: ip
    }]
  }), {
    headers: { 'Content-Type': 'application/dns-json' }
  });
}
```

## Integração com IceWall

Adicionar callback no engine.php quando usuário atinge high-trust:

```php
public function analyze() {
    // ... validações existentes ...

    if ($this->confidence >= $threshold) {
        // Notificar DNS server
        $this->notifyDNSServer($_SERVER['REMOTE_ADDR']);

        return [
            'serve' => 'protected',
            'reason' => 'verified_human',
            'confidence' => $this->confidence
        ];
    }
}

private function notifyDNSServer($clientIP) {
    $dnsApiUrl = getenv('DNS_TRUST_API_URL');
    if (!$dnsApiUrl) return;

    $payload = json_encode([
        'client_ip' => $clientIP,
        'trust_level' => 'high',
        'deployment_id' => $this->deploymentId,
        'timestamp' => time()
    ]);

    $ch = curl_init($dnsApiUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Auth-Token: ' . getenv('DNS_API_KEY')
    ]);

    curl_exec($ch);
    curl_close($ch);
}
```

## Configuração DNS

### Nameserver Records

```
# Na sua zona DNS:
protectedsite.com.     NS    ns1.your-custom-dns.com.
protectedsite.com.     NS    ns2.your-custom-dns.com.

# TTL no NS record também deve ser baixo
protectedsite.com. 300 NS    ns1.your-custom-dns.com.
```

### Teste de Funcionamento

```bash
# Teste 1: Low-trust (primeira requisição)
$ dig @ns1.your-custom-dns.com protectedsite.com +short
192.168.1.10

# Teste 2: Simular high-trust callback
$ curl -X POST http://ns1.your-custom-dns.com:8053/trust-callback \
  -H "Content-Type: application/json" \
  -d '{"client_ip": "203.0.113.50", "trust_level": "high"}'

# Teste 3: Verificar que IP agora recebe high-trust
$ dig @ns1.your-custom-dns.com protectedsite.com \
  -b 203.0.113.50 +short
192.168.1.20

# Teste 4: Verificar TTL
$ dig @ns1.your-custom-dns.com protectedsite.com
;; ANSWER SECTION:
protectedsite.com. 30 IN A 192.168.1.20
                   ^^
                   TTL = 30 segundos
```

## Resistência à Auditoria

### Cenários Bloqueados

**1. Trocar IP/VPN e Comparar**
```
Auditor IP-A → DNS → 192.168.1.10 (low-trust)
Auditor IP-B → DNS → 192.168.1.10 (low-trust)
Resultado: Ambos veem mesmo conteúdo público
```

**2. Esperar e Re-testar**
```
T=0: IP-A → low-trust
T=300s: IP-A → AINDA low-trust (cache expirou mas não passou validação)
Resultado: Nunca atinge high-trust sem validação real
```

**3. Snapshot DNS em Paralelo**
```
Terminal 1: dig protectedsite.com → 192.168.1.10
Terminal 2: dig protectedsite.com (simultâneo) → 192.168.1.10
Resultado: TTL 30s impede ver IPs diferentes
```

## Vantagens

✅ **Invisível**: Auditor não sabe que DNS é dinâmico
✅ **Indetectável**: Mesmo hostname, nenhuma flag de redirecionamento
✅ **Não-comparável**: Impossível ter snapshot de ambos os IPs
✅ **Geograficamente agnóstico**: Funciona independente de geo-IP
✅ **Zero overhead**: DNS resolve antes de qualquer request HTTP

## Desvantagens

❌ Requer infraestrutura DNS customizada
❌ Complexidade operacional aumentada
❌ CDN pode não funcionar (CloudFlare resolve parcialmente)
❌ Debug difícil (diferentes pessoas veem IPs diferentes)

## Alternativa Simplificada: Round-Robin Falso

Se não puder implementar DNS customizado:

```
# DNS público retorna AMBOS os IPs
protectedsite.com. 30 IN A 192.168.1.10
protectedsite.com. 30 IN A 192.168.1.20

# Mas apenas IP-A está publicamente roteável
# IP-B está em VPC privada, acessível apenas via VPN
```

Auditor externo sempre conecta em IP-A (único acessível), enquanto usuários validados são VPN-roteados para IP-B.

## Conclusão

DNS Split-Horizon com TTL 30s é a **camada mais invisível** de todas as técnicas. Completamente indetectável, pois:

1. Nenhum redirect HTTP
2. Nenhuma diferença de headers
3. Nenhum status code diferente
4. Mesmo hostname em ambos os casos

**Filosofia Kevin Mitnick Nível 10:** O ataque que nem parece um ataque. O auditor nunca saberá que está vendo apenas metade do sistema.

## Próximos Passos

1. Escolher implementação DNS (PowerDNS, Node.js, ou CloudFlare Workers)
2. Configurar nameservers customizados
3. Implementar API de trust callback
4. Adicionar `notifyDNSServer()` no IceWall engine
5. Testar com múltiplos IPs e verificar isolamento
