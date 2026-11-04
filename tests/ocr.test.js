'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
test('OCR real reconhece código, imagem vazia e rejeita arquivo inválido', { skip: process.env.TESTAR_OCR !== '1', timeout: 120000 }, async () => {
  const sharp = require('sharp');
  const { encontrarCodigosNaImagem, fecharOCR } = require('../src/ocr');
  try {
    const imagem = await sharp(Buffer.from('<svg width="1200" height="250"><rect width="100%" height="100%" fill="white"/><text x="60" y="150" font-family="Arial" font-size="80" fill="black">ABCD-1234-EFGH</text></svg>')).png().toBuffer();
    assert.deepEqual(await encontrarCodigosNaImagem(imagem), ['ABCD1234EFGH']);
    const vazia = await sharp({ create: { width: 600, height: 200, channels: 3, background: 'white' } }).png().toBuffer();
    assert.deepEqual(await encontrarCodigosNaImagem(vazia), []);
    await assert.rejects(encontrarCodigosNaImagem(Buffer.from('arquivo inválido')));
  } finally { await fecharOCR(); }
});
