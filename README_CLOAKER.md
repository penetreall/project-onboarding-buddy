# IceWall - Sistema de Proteção Invisível

Sistema de proteção avançado com 3 camadas de segurança inspirado em conceitos de segurança ofensiva aplicados defensivamente.

## Arquitetura de 3 Camadas

### Camada 1: Stealth Handshake
Redirecionamento silencioso com parâmetro único por deployment. Elimina crawlers que não mantêm estado.

- Parâmetro único gerado por deployment
- Cookie de tracking com validade de 30 dias
- Desafio de presença que requer JavaScript
- Redirecionamento automático para visitantes brasileiros

### Camada 2: Trust Score Vector
Sistema de pontuação de confiança baseado em múltiplos fatores:

- **Geo-IP consistente** (+20 pontos)
- **User-Agent humano** (+20 pontos)
- **Headers secundários** (Accept-Language, Referer) (+10 pontos)
- **Cookie de tracking válido** (+30 pontos)
- **Desafio JavaScript** (+20 pontos)

Score float de 0-1, não booleano como WAFs tradicionais.

### Camada 3: Stateful Split-Tunnel
Serve conteúdo diferente baseado no score sem trocar URL:

- **Low sensitivity** (0.50): Mais permissivo
- **Medium sensitivity** (0.65): Padrão recomendado
- **High sensitivity** (0.75): Mais restritivo
- **Maximum sensitivity** (0.85): Máxima proteção

## Como Usar

### 1. Iniciar o Backend

```bash
cd supabase/functions/ice-wall-backend
npm install
npm start
```

O backend rodará em `http://localhost:3001`

### 2. Criar um Cloaker

1. Acesse o dashboard IceWall
2. Clique em "Novo Cloaker"
3. Configure:
   - **Domínio Público**: Página safe (exibida para bots)
   - **Domínio Protegido**: Página completa (exibida para humanos)
   - **Nível de Sensibilidade**: Quão rigoroso será o filtro

### 3. Baixar e Instalar o Pacote

1. Clique no botão de download do cloaker
2. Extraia o ZIP na raiz do seu servidor
3. Execute:
```bash
mkdir logs
chmod 755 logs
```

### 4. Estrutura do Pacote

```
icewall-{deployment-id}.zip
├── index.php           # Entry point
├── core/
│   └── engine.php      # Motor de análise e banco de dados
├── api/
│   └── logs.php        # API REST para estatísticas
├── logs/
│   ├── icewall.db      # Banco SQLite (criado automaticamente)
│   └── access.log      # Log de acessos
├── .htaccess           # Configuração Apache
└── README.txt          # Informações do deployment
```

## Banco de Dados SQLite

O sistema usa SQLite para armazenar dados localmente no servidor protegido:

### Tabelas

**deployments**
- Informações do deployment
- Estatísticas agregadas
- Configurações de sensibilidade

**access_logs**
- Cada requisição analisada
- Decisões tomadas (public/protected)
- Trust scores calculados
- Timestamps e fingerprints

**blocked_ips**
- IPs que falharam na verificação
- Contadores de tentativas
- Razões de bloqueio

## API de Logs

Após o deploy, você pode acessar estatísticas via API:

```bash
# Estatísticas gerais
GET https://seu-dominio.com/api/logs.php?action=stats

# Logs recentes
GET https://seu-dominio.com/api/logs.php?action=recent&limit=50

# IPs bloqueados
GET https://seu-dominio.com/api/logs.php?action=blocked&limit=100
```

## Fluxo de Proteção

1. **Visitante acessa o site**
   - Sistema verifica geo-IP
   - Se não for BR, serve página pública
   - Se for BR, injeta parâmetro único

2. **Com parâmetro único**
   - Sistema seta cookie de tracking
   - Redireciona para URL limpa
   - Cookie válido por 30 dias

3. **Análise de Trust Score**
   - Verifica cookie válido (+30)
   - Valida geo-IP consistente (+20)
   - Analisa User-Agent (+20)
   - Verifica headers (+10)
   - Desafio JavaScript (+20)

4. **Decisão de Split-Tunnel**
   - Score >= threshold: Serve página protegida
   - Score < threshold: Serve página pública
   - Tudo invisível, mesma URL

## Segurança

- Parâmetro único por deployment (não reutilizável)
- Cookies assinados com HMAC-SHA256
- Validação de geo-IP com cache
- Desafio JavaScript com sessão
- Proxy transparente via cURL
- Logs protegidos via .htaccess

## Filosofia Kevin Mitnick

O sistema segue princípios de engenharia social reversa:

1. **Invisibilidade**: Bots não sabem que estão sendo filtrados
2. **Análise Comportamental**: Não depende de blacklists
3. **Trust Building**: Sistema de confiança progressivo
4. **Zero False Positives**: Humanos reais sempre passam

## Limitações

- Requer Apache com mod_rewrite
- PHP 7.4+ com SQLite e cURL
- Não funciona com CDNs que não preservam cookies
- Geo-IP depende de API externa (ip-api.com)

## Próximos Passos

- [ ] Dashboard para visualizar logs em tempo real
- [ ] Machine Learning para detecção de padrões
- [ ] Integração com Cloudflare Workers
- [ ] Sistema de reputação distribuído
