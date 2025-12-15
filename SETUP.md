# IceWall - Guia de Configuração

Sistema de proteção invisível com 3 camadas de segurança. Este guia te ajudará a configurar e usar o IceWall completo.

## Requisitos

- Node.js 18+
- Conta Supabase configurada
- Servidor PHP 7.4+ com SQLite e cURL (para o deploy do cloaker)

## Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

O arquivo `.env` já está configurado com suas credenciais Supabase. Verifique se contém:

```env
VITE_SUPABASE_URL=https://oamktcbohqszeqbhilhq.supabase.co
VITE_SUPABASE_ANON_KEY=seu-anon-key
VITE_BACKEND_URL=http://localhost:3001
```

### 3. Iniciar o Backend

O backend é responsável por gerar os pacotes de proteção PHP.

```bash
cd supabase/functions/ice-wall-backend
npm install
npm start
```

O backend estará rodando em `http://localhost:3001`

### 4. Iniciar o Frontend

Em outro terminal, na raiz do projeto:

```bash
npm run dev
```

O dashboard estará disponível em `http://localhost:5173`

## Como Usar

### Passo 1: Criar Conta e Login

1. Acesse o dashboard
2. Crie uma conta com email/senha
3. Faça login

### Passo 2: Configurar um Cloaker

1. Clique em "Novo Cloaker"
2. Preencha os campos:
   - **Domínio Público**: URL da página safe (exibida para bots)
     - Exemplo: `https://sitegenerico.com`
   - **Domínio Protegido**: URL da página real (exibida para humanos)
     - Exemplo: `https://meusite.com`
   - **Nível de Sensibilidade**:
     - `low`: Threshold 0.50 (mais permissivo)
     - `medium`: Threshold 0.65 (recomendado)
     - `high`: Threshold 0.75 (mais restritivo)
     - `maximum`: Threshold 0.85 (máxima proteção)
3. Clique em "Criar Cloaker"

### Passo 3: Baixar o Pacote de Proteção

1. Na lista de domínios, clique no botão de download (ícone de seta para baixo)
2. Um arquivo ZIP será baixado com nome: `icewall-{deployment-id}.zip`
3. Esse ZIP contém:
   - Sistema PHP completo de 3 camadas
   - Banco de dados SQLite integrado
   - API de logs em tempo real
   - Configurações únicas por deployment

### Passo 4: Instalar no Servidor

1. Extraia o ZIP na raiz do seu servidor web:
```bash
unzip icewall-*.zip -d /var/www/html/
```

2. Crie e configure a pasta de logs:
```bash
mkdir /var/www/html/logs
chmod 755 /var/www/html/logs
chown www-data:www-data /var/www/html/logs
```

3. Verifique se o Apache tem mod_rewrite habilitado:
```bash
a2enmod rewrite
systemctl restart apache2
```

### Passo 5: Testar a Proteção

1. Acesse seu domínio normalmente
2. Se você estiver no Brasil:
   - Primeira visita: Será redirecionado com um parâmetro único
   - Cookie será criado (válido por 30 dias)
   - Desafio JavaScript será executado
   - Se passar: Verá o conteúdo protegido
3. Se você não estiver no Brasil ou for um bot:
   - Verá automaticamente o conteúdo público

## Como Funciona

### Arquitetura de 3 Camadas

**Camada 1: Stealth Handshake**
- Parâmetro único gerado por deployment
- Cookie de tracking assinado com HMAC
- Geo-IP targeting (apenas BR)

**Camada 2: Trust Score Vector**
- Geo-IP consistente: +20 pontos
- User-Agent humano: +20 pontos
- Headers secundários: +10 pontos
- Cookie válido: +30 pontos
- Desafio JavaScript: +20 pontos
- Total: 100 pontos (score 0-1)

**Camada 3: Stateful Split-Tunnel**
- Score >= threshold: Serve domínio protegido
- Score < threshold: Serve domínio público
- Mesma URL, conteúdo diferente
- Totalmente invisível

### Banco de Dados Local

O sistema cria automaticamente um banco SQLite em `logs/icewall.db` com:

- **deployments**: Informações e estatísticas do deployment
- **access_logs**: Cada requisição analisada com decisões e scores
- **blocked_ips**: IPs que não passaram na verificação

### API de Logs

Após o deploy, você pode consultar estatísticas:

```bash
# Ver estatísticas gerais
curl https://seu-dominio.com/api/logs.php?action=stats

# Ver logs recentes (últimos 50)
curl https://seu-dominio.com/api/logs.php?action=recent&limit=50

# Ver IPs bloqueados
curl https://seu-dominio.com/api/logs.php?action=blocked&limit=100
```

## Filosofia de Segurança

Este sistema segue a mentalidade de Kevin Mitnick de engenharia social reversa:

1. **Invisibilidade Total**: Bots não sabem que estão sendo filtrados
2. **Análise Comportamental**: Não usa blacklists, analisa comportamento
3. **Trust Progressivo**: Score baseado em múltiplos fatores
4. **Zero False Positives**: Humanos reais sempre passam eventualmente

## Troubleshooting

### Backend não está rodando

Erro: `Erro ao gerar pacote: Failed to fetch`

Solução:
```bash
cd supabase/functions/ice-wall-backend
npm install
npm start
```

### Parâmetro único não aparece na URL

Causa: Você não está acessando do Brasil

Solução: O sistema só injeta o parâmetro para visitantes brasileiros. Para testar:
- Use uma VPN brasileira
- Ou modifique temporariamente o código em `engine.php` para aceitar outros países

### Cookie não está sendo criado

Causa: Domínio precisa usar HTTPS

Solução: Configure SSL/TLS no seu servidor ou teste em localhost

### Logs não estão sendo salvos

Causa: Permissões da pasta logs

Solução:
```bash
chmod 755 /var/www/html/logs
chown www-data:www-data /var/www/html/logs
```

## Próximos Passos

Depois de configurar:

1. Monitore os logs via API
2. Ajuste o nível de sensibilidade conforme necessário
3. Implemente dashboard de visualização de logs
4. Considere adicionar mais fatores ao trust score

## Segurança

- Parâmetros únicos não são reutilizáveis entre deployments
- Cookies assinados com HMAC-SHA256
- Banco de dados SQLite local (não exposto)
- API de logs com CORS habilitado
- Logs de acesso protegidos via .htaccess

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs em `logs/access.log`
2. Consulte `README_CLOAKER.md` para detalhes técnicos
3. Verifique o console do navegador para erros JavaScript
