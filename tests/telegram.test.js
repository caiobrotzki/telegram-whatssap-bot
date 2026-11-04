'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { executarTelegram, enviarAlerta } = require('../src/telegram');
test('Telegram: formatação, erros e credenciais', async t => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  t.after(() => { if (token === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = token; if (chat === undefined) delete process.env.TELEGRAM_CHAT_ID; else process.env.TELEGRAM_CHAT_ID = chat; });
  delete process.env.TELEGRAM_BOT_TOKEN;
  await assert.rejects(executarTelegram('getUpdates'), /TOKEN/);
  process.env.TELEGRAM_BOT_TOKEN = '123:fake'; process.env.TELEGRAM_CHAT_ID = '456';
  const mock = t.mock.method(globalThis, 'fetch', async (url, opcoes) => {
    assert.equal(url, 'https://api.telegram.org/bot123:fake/sendMessage');
    const body = JSON.parse(opcoes.body); assert.equal(body.chat_id, '456'); assert.equal(body.parse_mode, 'HTML'); assert.match(body.text, /<code>ABCD1234EFGH<\/code>/);
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) };
  });
  assert.deepEqual(await enviarAlerta(['ABCD1234EFGH']), { message_id: 1 });
  mock.mock.mockImplementation(async () => ({ ok: false, json: async () => ({ ok: false, description: 'chat not found' }) }));
  await assert.rejects(enviarAlerta(['ABCD1234EFGH']), /chat not found/);
  mock.mock.mockImplementation(async () => { throw new Error('timeout'); });
  await assert.rejects(enviarAlerta(['ABCD1234EFGH']), /timeout/);
  delete process.env.TELEGRAM_CHAT_ID; await assert.rejects(enviarAlerta([]), /CHAT_ID/);
});
