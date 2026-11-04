'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extrairCodigos } = require('../src/codigos');

test('identifica códigos separados por hífen', () => {
  assert.deepEqual(extrairCodigos('PSN: ABCD-EFGH-JKLM'), ['ABCDEFGHJKLM']);
});

test('identifica códigos separados por espaços', () => {
  assert.deepEqual(extrairCodigos('ABCD EFGH JKLM'), ['ABCDEFGHJKLM']);
});

test('identifica código na mesma linha sem separadores', () => {
  assert.deepEqual(extrairCodigos('codigo: abcd1234efgh'), ['ABCD1234EFGH']);
});

test('não identifica código com apenas 11 caracteres', () => {
  assert.deepEqual(extrairCodigos('ABCD-EFGH-JKL'), []);
});

test('não identifica palavras comuns sem formato de 12 caracteres', () => {
  assert.deepEqual(extrairCodigos('Presente da PlayStation Store'), []);
});

test('não repete o mesmo código mais de uma vez', () => {
  assert.deepEqual(extrairCodigos('ABCD-EFGH-JKLM e ABCDEFGHJKLM'), ['ABCDEFGHJKLM']);
});
