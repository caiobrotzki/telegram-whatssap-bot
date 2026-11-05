'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { baixarImagem } = require('../src/midia');
function ambiente({ stage = 'INIT', erro, ausente = false, mime = 'image/jpeg', cache = true } = {}) {
  const chamadas = [];
  const modelo = { type: 'image', mimetype: mime, mediaData: { mediaStage: stage }, downloadMedia: async () => chamadas.push('preparar') };
  const colecao = { get: id => { assert.equal(id, 'id-completo'); return cache && !ausente ? modelo : undefined; }, getMessagesById: async ids => { assert.deepEqual(Array.from(ids), ['id-completo']); return { messages: ausente ? [] : [modelo] }; } };
  const contexto = { AbortController, setTimeout, clearTimeout, window: {
    require: nome => {
      if (nome === 'WAWebCollections') return { Msg: colecao };
      if (nome === 'WAWebDownloadManager') return { downloadManager: { downloadAndMaybeDecrypt: async parametros => {
        assert.equal(parametros.mimetype, 'image/jpeg');
        assert.equal(parametros.type, 'image');
        assert.ok(parametros.signal instanceof AbortSignal);
        chamadas.push('download');
        if (erro) throw erro;
        return new Uint8Array([1, 2, 3]);
      } } };
      throw Error('Módulo inesperado');
    },
    WWebJS: { arrayBufferToBase64Async: async bytes => Buffer.from(bytes).toString('base64') }
  } };
  const mensagem = { id: { $1: 'id-completo' }, client: { pupPage: { evaluate: async (fn, id) => vm.runInNewContext(`(${fn.toString()})(${JSON.stringify(id)})`, contexto) } } };
  return { mensagem, chamadas };
}
for (const cache of [true, false]) test('download encaminha MIME correto, com cache=' + cache, async () => {
  const c = ambiente({ cache }); const resultado = await baixarImagem(c.mensagem);
  assert.equal(resultado.data, 'AQID'); assert.equal(resultado.mimetype, 'image/jpeg');
  assert.deepEqual(c.chamadas, ['preparar', 'download']);
});
test('mídia resolvida não precisa de preparação', async () => {
  const c = ambiente({ stage: 'RESOLVED' }); await baixarImagem(c.mensagem); assert.deepEqual(c.chamadas, ['download']);
});
for (const opcoes of [{ ausente: true }, { stage: 'REUPLOADING' }, { stage: 'FETCHING' }, { stage: 'ERROR' }, { erro: { status: 404 } }]) test('mídia indisponível retorna vazio: ' + JSON.stringify(opcoes), async () => {
  const c = ambiente(opcoes); assert.equal(await baixarImagem(c.mensagem), null);
});
test('erro preserva etapa e nome sem vazar mensagem sensível', async () => {
  const c = ambiente({ erro: { name: 'InvalidMediaFileType', message: 'URL e chave privadas' } });
  await assert.rejects(baixarImagem(c.mensagem), erro => erro.message === 'baixar e descriptografar: InvalidMediaFileType');
});
test('recusa MIME incorreto antes do download', async () => {
  const c = ambiente({ mime: 'application/octet-stream' }); await assert.rejects(baixarImagem(c.mensagem), /tipo de imagem/); assert.equal(c.chamadas.length, 0);
});
test('recusa mensagem sem ID antes de acessar o navegador', async () => {
  await assert.rejects(baixarImagem({ id: {} }), /sem ID/);
});
