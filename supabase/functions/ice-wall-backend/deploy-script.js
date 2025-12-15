// Este script lê todos os arquivos TS/JSON localmente e faz o deploy via API HTTP
const fs = require('fs');
const path = require('path');

const files = [
  'deno.json',
  'index.ts',
  'detection.ts',
  'observer.ts',
  'learning.ts',
  'risk-scoring.ts',
  'contradiction.ts'
];

const fileContents = {};
files.forEach(file => {
  fileContents[file] = fs.readFileSync(path.join(__dirname, file), 'utf8');
});

console.log(JSON.stringify({files: fileContents}, null, 2));
