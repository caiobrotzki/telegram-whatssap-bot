'use strict';

const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const { extrairCodigos } = require('./codigos');

let promessaWorker;

function obterWorker() {
  if (!promessaWorker) {
    promessaWorker = createWorker('eng').catch((erro) => {
      promessaWorker = undefined;
      throw erro;
    });
  }
  return promessaWorker;
}

async function encontrarCodigosNaImagem(buffer) {
  // Rejeita imagens excessivas antes de alocar memória no OCR.
  await sharp(buffer, { limitInputPixels: 25_000_000 }).metadata();
  const worker = await obterWorker();

  // Primeiro tenta a imagem original, sem alterações.
  const primeiraLeitura = await worker.recognize(buffer);
  const primeiros = extrairCodigos(primeiraLeitura.data.text);
  if (primeiros.length) return primeiros;

  // Segunda tentativa: amplia fotos pequenas e melhora o contraste.
  // Tudo acontece localmente; a imagem não é enviada a um serviço OCR.
  const metadados = await sharp(buffer, { limitInputPixels: 25_000_000 }).metadata();
  let tratamento = sharp(buffer, { limitInputPixels: 25_000_000 }).rotate();
  if (metadados.width && metadados.width < 1600) {
    tratamento = tratamento.resize({ width: 1600 });
  }

  const imagemTratada = await tratamento
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();

  const segundaLeitura = await worker.recognize(imagemTratada);
  return extrairCodigos(segundaLeitura.data.text);
}

async function fecharOCR() {
  if (!promessaWorker) return;
  try {
    const worker = await promessaWorker;
    await worker.terminate();
  } finally {
    promessaWorker = undefined;
  }
}

module.exports = { encontrarCodigosNaImagem, fecharOCR };
