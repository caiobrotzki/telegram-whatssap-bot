'use strict';

const fs = require('node:fs/promises');
const { encontrarCodigosNaImagem, fecharOCR } = require('./ocr');

(async () => {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error('Uso: npm run teste:imagem -- "C:\\caminho\\imagem.jpg"');
    process.exitCode = 1;
    return;
  }

  try {
    const buffer = await fs.readFile(caminho);
    const codigos = await encontrarCodigosNaImagem(buffer);
    console.log(codigos.length ? 'Possíveis códigos: ' + codigos.join(', ') : 'Nenhum código compatível encontrado.');
  } finally {
    await fecharOCR();
  }
})().catch(erro => {
  console.error(erro.message);
  process.exitCode = 1;
});
