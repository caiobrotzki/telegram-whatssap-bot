'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { listarGrupos, lerGruposCarregados } = require('../src/grupos');

test('lista IDs antigos e novos sem serializar mensagens ou contatos', async () => {
  const chats = [
    { id: { _serialized: '123@g.us' }, name: 'Grupo A', serialize() { throw Error('r'); } },
    { id: { $1: '456@g.us' }, groupMetadata: { subject: 'Grupo B' } },
    { id: { user: '789', server: 'g.us' } },
    { id: { _serialized: '123@c.us' }, name: 'Contato' },
    { id: { _serialized: '123@newsletter' } },
    {}
  ];
  const cliente = { pupPage: { evaluate: async fn => vm.runInNewContext(`(${fn.toString()})()`, {
    window: { require: nome => { assert.equal(nome, 'WAWebCollections'); return { Chat: { getModelsArray: () => chats } }; } }
  }) } };
  const resultado = JSON.parse(JSON.stringify(await listarGrupos(cliente)));
  assert.deepEqual(resultado.map(g => g.id._serialized), ['123@g.us', '456@g.us', '789@g.us']);
  assert.equal(resultado[1].name, 'Grupo B');
  assert.equal(resultado[2].name, '(grupo sem nome)');
});

test('retorna lista vazia quando não há conversas carregadas', () => {
  const resultado = vm.runInNewContext(`(${lerGruposCarregados.toString()})()`, {
    window: { require: () => ({ Chat: { getModelsArray: () => [] } }) }
  });
  assert.equal(resultado.length, 0);
});

test('propaga falha do navegador para diagnóstico', async () => {
  await assert.rejects(listarGrupos({ pupPage: { evaluate: async () => { throw Error('Sessão encerrada'); } } }), /Sessão encerrada/);
});
