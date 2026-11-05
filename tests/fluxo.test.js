'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { criarProcessador } = require('../src/processador');
const { validarConfiguracao } = require('../src/config');
const { carregarHistorico, registrar } = require('../src/historico');

function cenario(opcoes = {}) {
  const historico = { ids: new Set(), codigos: new Set() };
  const chamadas = { ocr: 0, alertas: [] };
  const processar = criarProcessador({
    idGrupo: '123@g.us', historico,
    baixarImagem: mensagem => mensagem.downloadMedia(),
    encontrarCodigosNaImagem: async () => { chamadas.ocr++; return opcoes.codigos ?? ['ABCD1234EFGH']; },
    enviarAlerta: async codigos => { if (opcoes.falhar) throw new Error('API indisponível'); chamadas.alertas.push(codigos); },
    registrar: (h, id, codigos = []) => { h.ids.add(id); codigos.forEach(c => h.codigos.add(c)); }
  });
  const mensagem = { from: '123@g.us', type: 'image', hasMedia: true, id: { _serialized: 'm1' }, downloadMedia: async () => ({ mimetype: 'image/png', data: Buffer.from('imagem').toString('base64') }) };
  return { historico, chamadas, processar, mensagem };
}
for (const [nome, alteracao] of Object.entries({ 'outro grupo': { from: '456@g.us' }, texto: { type: 'chat' }, video: { type: 'video' }, audio: { type: 'ptt' }, 'sem mídia': { hasMedia: false } })) {
  test('ignora ' + nome, async () => { const c = cenario(); await c.processar({ ...c.mensagem, ...alteracao }); assert.equal(c.chamadas.ocr, 0); assert.equal(c.historico.ids.size, 0); });
}
test('envia e deduplica mensagem e código', async () => {
  const c = cenario(); await c.processar(c.mensagem); await c.processar(c.mensagem);
  await c.processar({ ...c.mensagem, id: { _serialized: 'm2' } });
  assert.equal(c.chamadas.ocr, 2); assert.deepEqual(c.chamadas.alertas, [['ABCD1234EFGH']]); assert.equal(c.historico.ids.size, 2);
});
test('processa imagem enviada pela própria conta', async () => { const c = cenario(); await c.processar({ ...c.mensagem, fromMe: true, from: 'eu@c.us', to: '123@g.us' }); assert.equal(c.chamadas.alertas.length, 1); });
test('não registra falha de envio, permitindo nova tentativa', async () => { const c = cenario({ falhar: true }); await assert.rejects(c.processar(c.mensagem), /API/); assert.equal(c.historico.ids.size, 0); assert.equal(c.historico.codigos.size, 0); });
test('registra imagem sem código', async () => { const c = cenario({ codigos: [] }); await c.processar(c.mensagem); assert.equal(c.historico.ids.size, 1); assert.equal(c.chamadas.alertas.length, 0); });
for (const midia of [undefined, { mimetype: 'video/mp4', data: '' }]) {
  test('ignora download indisponível ou tipo incorreto', async () => { const c = cenario(); await c.processar({ ...c.mensagem, downloadMedia: async () => midia }); assert.equal(c.chamadas.ocr, 0); assert.equal(c.historico.ids.size, 0); });
}
test('ignora imagens acima de 12 MB', async () => { const c = cenario(); await c.processar({ ...c.mensagem, downloadMedia: async () => ({ mimetype: 'image/png', data: Buffer.alloc(12 * 1024 * 1024 + 1).toString('base64') }) }); assert.equal(c.chamadas.ocr, 0); assert.equal(c.historico.ids.size, 1); });
test('configuração rejeita exemplos e aceita IDs atuais e antigos', () => {
  assert.equal(validarConfiguracao({}).length, 3);
  for (const id of ['123@g.us', '123-456@g.us']) assert.deepEqual(validarConfiguracao({ WHATSAPP_GROUP_ID: id, TELEGRAM_CHAT_ID: '123', TELEGRAM_BOT_TOKEN: '123:abc_DEF-123' }), []);
});
test('histórico persiste, recarrega e limita 1000 itens', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psn-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const arquivo = path.join(dir, 'data', 'historico.json');
  const h = carregarHistorico(arquivo); assert.equal(h.ids.size, 0);
  for (let i = 0; i < 1001; i++) { h.ids.add('m' + i); h.codigos.add('c' + i); }
  registrar(h, 'final', ['codigo'], arquivo);
  const lido = carregarHistorico(arquivo); assert.equal(lido.ids.size, 1000); assert.equal(lido.codigos.size, 1000); assert.ok(lido.ids.has('final')); assert.ok(lido.codigos.has('codigo')); assert.ok(!lido.ids.has('m0'));
});
test('histórico corrompido não é apagado silenciosamente', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psn-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const arquivo = path.join(dir, 'historico.json'); fs.writeFileSync(arquivo, 'invalido'); assert.throws(() => carregarHistorico(arquivo));
});

test('normaliza ID $1 antes do download e preserva deduplicação', async () => {
  const c = cenario();
  const mensagem = { ...c.mensagem, id: { $1: 'novo-id' }, async downloadMedia() {
    assert.equal(this.id._serialized, 'novo-id');
    return { mimetype: 'image/png', data: Buffer.from('imagem').toString('base64') };
  } };
  await c.processar(mensagem);
  await c.processar(mensagem);
  assert.equal(c.chamadas.ocr, 1);
  assert.ok(c.historico.ids.has('novo-id'));
  assert.ok(!c.historico.ids.has(undefined));
});
test('ID ausente impede download e registro de undefined', async () => {
  const c = cenario();
  await assert.rejects(c.processar({ ...c.mensagem, id: {}, downloadMedia: async () => assert.fail('não deveria baixar') }), /sem ID/);
  assert.equal(c.historico.ids.size, 0);
});
test('falha de download identifica a etapa e não registra a mensagem', async () => {
  const c = cenario();
  await assert.rejects(c.processar({ ...c.mensagem, downloadMedia: async () => { throw new Error('r'); } }), /Falha ao baixar imagem do WhatsApp: r/);
  assert.equal(c.historico.ids.size, 0);
  assert.equal(c.chamadas.ocr, 0);
});
