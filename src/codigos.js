'use strict';

/**
 * Identifica sequências COMPATÍVEIS com a aparência de códigos PSN.
 * A detecção por formato não valida a existência, autenticidade ou saldo.
 */
function extrairCodigos(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return [];

  const normalizado = texto
    .toUpperCase()
    .replace(/[‐‑‒–—−]/g, '-');

  const encontrados = new Set();
  const padroes = [
    // Por exemplo: ABCD-EFGH-JKLM, ABCD EFGH JKLM ou em linhas separadas.
    /(?<![A-Z0-9])([A-Z0-9]{4}[\s-]+[A-Z0-9]{4}[\s-]+[A-Z0-9]{4})(?![A-Z0-9])/g,
    // Alguns cartões exibem os 12 caracteres juntos.
    /(?<![A-Z0-9])([A-Z0-9]{12})(?![A-Z0-9])/g
  ];

  for (const padrao of padroes) {
    for (const correspondencia of normalizado.matchAll(padrao)) {
      const codigo = correspondencia[1].replace(/[^A-Z0-9]/g, '');
      if (codigo.length === 12) encontrados.add(codigo);
    }
  }

  return [...encontrados].slice(0, 5);
}

module.exports = { extrairCodigos };
