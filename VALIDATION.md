# ✅ Google Ads Mode - Validation Guide

## 🎯 Critérios de Aceite

Para considerar o Google Ads Mode funcionando corretamente, TODOS estes critérios devem passar:

### 1. ✅ Mobile + gclid válido → REAL
```
Input:
- Platform: Mobile (iOS/Android)
- gclid: válido (formato correto, entropia > 3.0)
- IP: Brasil, não-datacenter
- Referer: ausente (OK para iOS/Safari)

Expected Output:
- decision: "real"
- finalRisk: ≤ 0.35
- Logs: "[GOOGLE_ADS_MODE] DETERMINISTIC_OVERRIDE"
```

### 2. ✅ UTMs sem gclid → SAFE
```
Input:
- Platform: Mobile
- utm_source: google (mas SEM gclid)
- IP: Brasil, não-datacenter

Expected Output:
- decision: "safe" ou "safe_observe"
- Reason: "No click-id = no economic value"
```

### 3. ✅ Bot/Datacenter → SAFE
```
Input:
- gclid: válido
- IP: Datacenter (AWS, Google Cloud, etc)
- OU User-Agent: bot patterns

Expected Output:
- decision: "safe"
- Reason: "High risk despite gclid - datacenter or bot detected"
```

### 4. ✅ Logs aparecendo no dashboard
```
- Acessos reais devem aparecer no dashboard do IceWall
- Timestamp correto
- Decisão correta
- Informações de gclid visíveis
```

---

## 🧪 Como Testar

### Teste Automatizado (RECOMENDADO)

Use o endpoint de teste criado especificamente para validação:

```bash
curl -X GET "https://[PROJECT_URL]/functions/v1/ice-wall-backend/test-google-ads-mode"
```

**Resultado esperado:**
```json
{
  "status": "✅ ALL TESTS PASSED",
  "results": [
    {
      "name": "Mobile + Valid gclid → REAL",
      "expected": "real",
      "actual": "real",
      "finalRisk": 0.05,
      "passed": true
    },
    {
      "name": "UTMs without gclid → SAFE",
      "expected": "safe" | "safe_observe",
      "actual": "safe",
      "passed": true
    },
    {
      "name": "Bot/Datacenter → SAFE",
      "expected": "safe",
      "actual": "safe",
      "passed": true
    }
  ]
}
```

### Verificar Logs (Console do Supabase)

Acesse os logs do Edge Function e procure por:

```
[GOOGLE_ADS_MODE] {
  gclidDetected: true,
  gclidValid: true,
  network: "google_ads",
  isDatacenter: false,
  isBotDetected: false,
  decisionFinal: "real",
  reason: "DETERMINISTIC_OVERRIDE"
}
```

**Se esses logs NÃO aparecerem** = a lógica não está sendo executada.

### Teste Manual com Tráfego Real

1. **Obter gclid real:**
   - Crie uma campanha no Google Ads (ou use existente)
   - Gere um clique real no anúncio
   - Capture o `gclid` da URL

2. **Simular acesso:**
   ```bash
   curl -X POST "https://[PROJECT_URL]/functions/v1/ice-wall-backend/validate" \
     -H "Content-Type: application/json" \
     -d '{
       "param_key": "YOUR_PARAM_KEY",
       "ip": "191.52.123.45",
       "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
       "country": "BR",
       "headers": {
         "referer": "",
         "accept-language": "en-US,en;q=0.9"
       }
     }'
   ```

3. **Verificar resposta:**
   ```json
   {
     "decision": "real",
     "redirect": "money",
     "destination": "/biblioteca/?_bp12345678",
     "risk": {
       "decision": "real",
       "score": 0.05
     }
   }
   ```

---

## 🔍 Diagnóstico de Problemas

### Problema 1: decision: "safe" mesmo com gclid válido

**Possíveis causas:**

1. **Edge Function não deployed**
   - Solução: Fazer deploy do Edge Function
   ```bash
   # Verificar se função existe
   curl "https://[PROJECT_URL]/functions/v1/ice-wall-backend"
   ```

2. **gclid não está sendo detectado**
   - Verificar URL: `?gclid=XXXX` presente?
   - Verificar click-id validator logs
   - Solução: Garantir que query params são passados

3. **IP detectado como datacenter**
   - Verificar logs: `[DETECTION_STATUS] isDatacenter: true`
   - Solução: Usar IP residencial real (não VPN/proxy)

4. **Bot detection ativado**
   - Verificar logs: `[DETECTION_STATUS] isBotDetected: true`
   - Verificar User-Agent: não usar strings de bot

### Problema 2: Logs não aparecem no dashboard

**Diagnóstico:**

1. **PHP salvando localmente, backend não recebendo**
   - Verificar SQLite local no servidor: `icewall_logs.db`
   - Se logs estão lá = PHP funciona, mas não envia para backend

2. **Solução: PHP deve enviar logs para backend**
   - Adicionar no PHP (após decisão):
   ```php
   // Send log to backend
   $logData = json_encode([
     'domain_id' => $domainId,
     'decision' => $decision,
     'ip' => $ip,
     'user_agent' => $ua,
     'country' => $co,
     'gclid' => $_GET['gclid'] ?? null,
     'utm_source' => $_GET['utm_source'] ?? null,
     'referer' => $_SERVER['HTTP_REFERER'] ?? null,
     'timestamp' => date('Y-m-d H:i:s'),
   ]);

   $logCh = curl_init('BACKEND_URL/ingest-logs');
   curl_setopt($logCh, CURLOPT_RETURNTRANSFER, true);
   curl_setopt($logCh, CURLOPT_POST, true);
   curl_setopt($logCh, CURLOPT_POSTFIELDS, $logData);
   curl_setopt($logCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
   curl_setopt($logCh, CURLOPT_TIMEOUT, 2);
   curl_exec($logCh);
   curl_close($logCh);
   ```

3. **Verificar endpoint de ingestão:**
   ```bash
   curl -X POST "https://[PROJECT_URL]/functions/v1/ice-wall-backend/ingest-logs" \
     -H "Content-Type: application/json" \
     -d '{
       "domain_id": "YOUR_DOMAIN_ID",
       "decision": "real",
       "ip": "191.52.123.45",
       "timestamp": "2024-12-14T12:00:00"
     }'
   ```

   **Resposta esperada:**
   ```json
   {
     "success": true,
     "message": "Log ingested successfully"
   }
   ```

### Problema 3: Logs mostram DETERMINISTIC_OVERRIDE mas decision ainda é "safe"

**Diagnóstico:**

- Verificar se há override POSTERIOR no código
- Verificar linha de `finalDecision` override no index.ts
- Solução: Garantir que Google Ads Mode bypassa todos os overrides posteriores

**Código correto:**
```typescript
const isGoogleAdsMode = riskContext.clickId?.isValid &&
                        riskContext.clickId?.network === 'google_ads' &&
                        !isDatacenter &&
                        !isBotDetected;

if (isGoogleAdsMode) {
  // Use risk assessment decision directly (já tem override determinístico)
  finalDecision = riskAssessment.decision;
} else {
  // Apply normal overrides
  if (contradictionResult.botLikelihood > 0.7) {
    finalDecision = 'safe';
  }
  // ...
}
```

---

## 📊 Métricas de Sucesso

Após deploy correto, espera-se:

| Métrica | Target | Status |
|---------|--------|--------|
| Google Ads (mobile, gclid válido) → REAL | ≥ 90% | ⏳ |
| Tráfego sem gclid → SAFE | 100% | ⏳ |
| Datacenter com gclid → SAFE | 100% | ⏳ |
| Logs visíveis no dashboard | 100% | ⏳ |
| Console logs `[GOOGLE_ADS_MODE]` presentes | 100% | ⏳ |

---

## 🚀 Próximos Passos

Após validação bem-sucedida:

1. **Monitorar conversões reais**
   - Comparar taxa de conversão antes/depois
   - Esperado: aumento de 30-50% em conversões de Google Ads

2. **Ajustar thresholds se necessário**
   - Se ainda houver falsos positivos, revisar `finalRisk` cap
   - Atualmente: `0.35` para Google Ads

3. **Expandir para outras redes**
   - Facebook Ads: `fbclid`
   - TikTok Ads: `ttclid`
   - Mesma lógica: click-id válido + não-datacenter = REAL

---

**Status:** ✅ Código implementado | ⏳ Aguardando validação em produção
**Versão:** IceWall 7.1.0 - Google Ads Mode
**Data:** 2024-12-14
