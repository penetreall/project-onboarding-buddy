const bcrypt = require('bcryptjs');

async function generateHashes() {
  const devianHash = await bcrypt.hash('solitude', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  console.log('Devian hash:', devianHash);
  console.log('Admin hash:', adminHash);

  const devianTest = await bcrypt.compare('solitude', devianHash);
  const adminTest = await bcrypt.compare('admin123', adminHash);

  console.log('Devian test:', devianTest);
  console.log('Admin test:', adminTest);
}

generateHashes();
