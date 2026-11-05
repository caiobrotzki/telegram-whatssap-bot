'use strict';

// Executada no navegador. Não serializa conversas, participantes nem mensagens:
// getChats() pode falhar ao buscar a última mensagem de uma única conversa.
function lerGruposCarregados() {
  const colecao = window.require('WAWebCollections').Chat;
  return colecao.getModelsArray().flatMap(chat => {
    const id = chat.id?._serialized || chat.id?.$1 ||
      (chat.id?.user && chat.id?.server ? `${chat.id.user}@${chat.id.server}` : '');
    if (typeof id !== 'string' || !id.endsWith('@g.us')) return [];
    return [{ name: chat.name || chat.groupMetadata?.subject || '(grupo sem nome)', id: { _serialized: id } }];
  });
}

async function listarGrupos(cliente) {
  return cliente.pupPage.evaluate(lerGruposCarregados);
}

module.exports = { listarGrupos, lerGruposCarregados };
