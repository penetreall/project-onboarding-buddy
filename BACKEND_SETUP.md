# Backend IceWall - Edge Function

## Status

✅ **Backend está ATIVO e rodando automaticamente!**

O backend está deployado como **Supabase Edge Function** e roda 24/7 sem necessidade de servidor próprio.

## URL do Backend

```
https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend
```

## Endpoints Disponíveis

### 1. Gerar Pacote de Proteção

**POST** `/generate-bypass`

Gera um pacote IceWall com arquivos PHP configurados.

**Request:**
```json
{
  "publicDomain": "exemplo-publico.com",
  "protectedDomain": "exemplo-real.com",
  "sensitivityLevel": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "deploymentId": "m2n3o4p5q6r7",
  "paramName": "_a1b2c3",
  "apiUrl": "https://exemplo-real.com/api/logs.php",
  "files": {
    "index.php": "<?php ...",
    ".htaccess": "RewriteEngine On ...",
    "README.md": "# IceWall ..."
  },
  "message": "Pacote gerado com sucesso!"
}
```

### 2. Listar Deployments

**GET** `/deployments`

Lista deployments salvos (em breve integrado com banco).

**Response:**
```json
{
  "deployments": [],
  "message": "Lista de deployments"
}
```

### 3. Status do Backend

**GET** `/`

Verifica se o backend está online.

**Response:**
```json
{
  "status": "ok",
  "endpoints": {
    "POST /generate-bypass": "Gera pacote de proteção",
    "GET /deployments": "Lista deployments"
  }
}
```

## Como Usar no Frontend

O frontend já está configurado para usar o backend automaticamente:

```typescript
// src/lib/api.ts
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Gerar pacote
const response = await fetch(`${BACKEND_URL}/generate-bypass`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    publicDomain: 'exemplo.com',
    protectedDomain: 'real.com',
    sensitivityLevel: 'medium'
  })
});

const data = await response.json();
console.log(data.deploymentId);
```

## Variáveis de Ambiente

Já configurado em `.env`:

```bash
VITE_BACKEND_URL=https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend
```

## Vantagens da Edge Function

### ✅ Zero Manutenção
- Roda automaticamente 24/7
- Sem necessidade de servidor próprio
- Sem preocupação com uptime

### ✅ Escalável
- Suporta milhares de requisições
- Auto-scaling automático
- Zero configuração

### ✅ Seguro
- CORS configurado
- HTTPS nativo
- Isolado do frontend

### ✅ Gratuito
- Plano free do Supabase
- Sem custos de servidor
- Sem necessidade de VPS

## Teste Manual

### cURL

```bash
# Testar status
curl https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend

# Gerar pacote
curl -X POST https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend/generate-bypass \
  -H "Content-Type: application/json" \
  -d '{
    "publicDomain": "teste.com",
    "protectedDomain": "real-teste.com",
    "sensitivityLevel": "medium"
  }'
```

### JavaScript

```javascript
// Testar no console do navegador
fetch('https://oamktcbohqszeqbhilhq.supabase.co/functions/v1/ice-wall-backend')
  .then(r => r.json())
  .then(console.log);
```

## Logs

Para ver logs do backend:

1. Acesse: https://supabase.com/dashboard/project/oamktcbohqszeqbhilhq/functions/ice-wall-backend
2. Vá em "Logs"
3. Veja requisições em tempo real

## Deploy / Atualizar

Para fazer deploy de mudanças:

```bash
# Código já deployado automaticamente!
# Qualquer mudança em supabase/functions/ice-wall-backend/index.ts
# pode ser deployada via interface
```

## Diferenças vs Node.js Local

| Aspecto | Node.js Local | Edge Function |
|---------|---------------|---------------|
| Precisa rodar | ✅ Sim (`npm start`) | ❌ Não (sempre ativo) |
| Porta | 3001 | 443 (HTTPS) |
| HTTPS | ❌ Não | ✅ Sim (nativo) |
| Uptime | Depende de você | 99.9% |
| Escalabilidade | Limitada | Ilimitada |
| Custo | Servidor próprio | Gratuito |

## Conclusão

**Você não precisa fazer NADA!** 🎉

O backend já está:
- ✅ Deployado
- ✅ Rodando
- ✅ Configurado no frontend
- ✅ Pronto para usar

Basta acessar a aplicação e clicar em "Gerar Pacote" na interface!
