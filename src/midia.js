'use strict';

// Executada no navegador: mantém o MIME declarado ao solicitar a descriptografia.
async function baixarNoNavegador(id) {
  let etapa = 'localizar mensagem';
  try {
    const colecao = window.require('WAWebCollections').Msg;
    const msg = colecao.get(id) || (await colecao.getMessagesById([id]))?.messages?.[0];
    if (!msg?.mediaData || msg.mediaData.mediaStage === 'REUPLOADING') return null;
    if (msg.type !== 'image' || !msg.mimetype?.startsWith('image/')) {
      return { erro: 'A mídia recebida não possui tipo de imagem reconhecido.' };
    }
    etapa = 'preparar mídia';
    if (msg.mediaData.mediaStage !== 'RESOLVED') {
      await msg.downloadMedia({ downloadEvenIfExpensive: true, rmrReason: 1 });
    }
    if (msg.mediaData.mediaStage?.includes('ERROR') || msg.mediaData.mediaStage === 'FETCHING') return null;
    etapa = 'baixar e descriptografar';
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 60_000);
    let bytes;
    try {
      bytes = await window.require('WAWebDownloadManager').downloadManager.downloadAndMaybeDecrypt({
        directPath: msg.directPath,
        encFilehash: msg.encFilehash,
        filehash: msg.filehash,
        mediaKey: msg.mediaKey,
        mediaKeyTimestamp: msg.mediaKeyTimestamp,
        type: msg.type,
        mimetype: msg.mimetype,
        signal: controlador.signal,
        downloadQpl: { addAnnotations() { return this; }, addPoint() { return this; } }
      });
    } finally {
      clearTimeout(limite);
    }
    etapa = 'converter imagem';
    return { mimetype: msg.mimetype, data: await window.WWebJS.arrayBufferToBase64Async(bytes) };
  } catch (erro) {
    if (erro?.status === 404) return null;
    // Não expõe URL, chaves de mídia ou conteúdo da mensagem nos logs.
    return { erro: `${etapa}: ${erro?.name || 'Erro'}${erro?.status ? ` (HTTP ${erro.status})` : ''}` };
  }
}

async function baixarImagem(mensagem) {
  const id = mensagem.id?._serialized || mensagem.id?.$1;
  if (typeof id !== 'string' || !id.trim()) throw new Error('Mensagem sem ID para download.');
  const resultado = await mensagem.client.pupPage.evaluate(baixarNoNavegador, id);
  if (resultado?.erro) throw new Error(resultado.erro);
  return resultado;
}

module.exports = { baixarImagem, baixarNoNavegador };
