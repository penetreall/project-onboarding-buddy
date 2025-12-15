const express = require('express');
const cors = require('cors');
const { generateBypassPackage } = require('./packageGenerator');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para gerar pacote
app.post('/api/generate-bypass', async (req, res) => {
  try {
    const { publicDomain, protectedDomain, sensitivityLevel } = req.body;

    console.log('Gerando pacote para:', protectedDomain);

    const result = await generateBypassPackage({
      publicDomain,
      protectedDomain,
      sensitivityLevel
    });

    console.log('✅ Deployment ID:', result.deploymentId);
    console.log('🔑 Parâmetro único:', result.paramName);
    console.log('📊 API de Logs:', result.apiUrl);  // NOVO!
    console.log('📦 Tamanho:', result.zipBuffer.length, 'bytes');

    // Headers com API URL
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="icewall-${result.deploymentId}.zip"`);
    res.setHeader('X-Api-Url', result.apiUrl);  // NOVO!
    
    res.send(result.zipBuffer);

  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// NOVO: Endpoint para listar deployments salvos (você pode salvar em banco)
app.get('/api/deployments', (req, res) => {
  // Aqui você retornaria do seu banco de dados
  // Por enquanto, exemplo estático:
  res.json({
    deployments: [
      {
        id: 'mj3yjggz533f',
        domain: 'kkkkkk23332.com',
        apiUrl: 'https://kkkkkk23332.com/api/logs.php',
        createdAt: '2025-12-13T10:30:00Z'
      }
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   POST /api/generate-bypass - Gera ZIP com banco de dados`);
  console.log(`   GET  /api/deployments - Lista deployments`);
});