'use strict';

function criarProcessador({ idGrupo, historico, encontrarCodigosNaImagem, enviarAlerta, registrar, baixarImagem = require('./midia').baixarImagem }) {
  return async function processarMensagem(mensagem) {

    // Não analisa mensagens de texto, vídeos nem imagens de outros grupos.
    if ((mensagem.fromMe ? mensagem.to : mensagem.from) !== idGrupo || mensagem.type !== 'image' || !mensagem.hasMedia) return;

    // Algumas versões do WhatsApp Web usam $1; downloadMedia ainda lê _serialized.
    const idMensagem = mensagem.id?._serialized || mensagem.id?.$1;
    if (typeof idMensagem !== 'string' || !idMensagem.trim()) {
      throw new Error('Imagem sem ID reconhecido; download não iniciado.');
    }
    mensagem.id._serialized = idMensagem;
    if (historico.ids.has(idMensagem)) return;

    console.log('Nova imagem do grupo monitorado. Baixando imagem...');
    let midia;
    try {
      midia = await baixarImagem(mensagem);
    } catch (erro) {
      throw new Error(`Falha ao baixar imagem do WhatsApp: ${erro.message || String(erro)}`, { cause: erro });
    }
    if (!midia || !midia.mimetype?.startsWith('image/')) {
      console.log('Imagem indisponível para download.');
      return;
    }

    const buffer = Buffer.from(midia.data, 'base64');
    if (buffer.byteLength > 12 * 1024 * 1024) {
      console.log('Imagem maior que 12 MB, ignorada.');
      registrar(historico, idMensagem);
      return;
    }

    console.log('Imagem baixada. Executando OCR...');
    const encontrados = await encontrarCodigosNaImagem(buffer);
    const novos = encontrados.filter(codigo => !historico.codigos.has(codigo));

    if (!novos.length) {
      console.log(encontrados.length ? 'Código já notificado anteriormente.' : 'Nenhum código compatível encontrado.');
      registrar(historico, idMensagem);
      return;
    }

    // Histórico só é registrado depois da confirmação da API do Telegram.
    await enviarAlerta(novos);
    registrar(historico, idMensagem, novos);
    console.log(`Telegram notificado: ${novos.length} código(s).`);
  };
}

module.exports = { criarProcessador };
