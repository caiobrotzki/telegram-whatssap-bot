'use strict';

const fs = require('node:fs');
const path = require('node:path');

const arquivo = path.join(__dirname, '..', 'data', 'historico.json');

function carregarHistorico(caminho = arquivo) {
  try {
    const json = JSON.parse(fs.readFileSync(caminho, 'utf8'));
    return {
      ids: new Set(Array.isArray(json.ids) ? json.ids : []),
      codigos: new Set(Array.isArray(json.codigos) ? json.codigos : [])
    };
  } catch (erro) {
    if (erro.code === 'ENOENT') return { ids: new Set(), codigos: new Set() };
    throw erro;
  }
}

function registrar(historico, idMensagem, novosCodigos = [], caminho = arquivo) {
  historico.ids.add(idMensagem);
  for (const codigo of novosCodigos) historico.codigos.add(codigo);

  // Preserva uma quantidade limitada de itens, mesmo após reiniciar.
  const ids = [...historico.ids].slice(-1000);
  const codigos = [...historico.codigos].slice(-1000);
  historico.ids = new Set(ids);
  historico.codigos = new Set(codigos);

  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const temporario = `${caminho}.tmp`;
  fs.writeFileSync(temporario, JSON.stringify({ ids, codigos }, null, 2));
  fs.renameSync(temporario, caminho);
}

module.exports = { carregarHistorico, registrar };
