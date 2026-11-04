'use strict';

function criarProcessador({ idGrupo, historico, encontrarCodigosNaImagem, enviarAlerta, registrar }) {
  return async function processarMensagem(mensagem) {

    // Não analisa mensagens de texto, vídeos nem imagens de outros grupos.
    if ((mensagem.fromMe ? mensagem.to : mensagem.from) !== idGrupo || mensagem.type !== 'image' || !mensagem.hasMedia) return;

    const idMensagem = mensagem.id._serialized;
    if (historico.ids.has(idMensagem)) return;

    console.log('Nova imagem do grupo monitorado. Executando OCR...');
    const midia = await mensagem.downloadMedia();
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
