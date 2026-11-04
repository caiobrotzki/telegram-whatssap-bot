'use strict';

function validarConfiguracao(env) {
  const erros = [];
  if (!/^\d+(?:-\d+)?@g\.us$/.test(env.WHATSAPP_GROUP_ID?.trim() || '')) {
    erros.push('WHATSAPP_GROUP_ID inválido: copie o ID completo terminado em @g.us.');
  }
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(env.TELEGRAM_BOT_TOKEN?.trim() || '')) {
    erros.push('TELEGRAM_BOT_TOKEN inválido: use o token fornecido pelo BotFather.');
  }
  if (!/^-?\d+$/.test(env.TELEGRAM_CHAT_ID?.trim() || '')) {
    erros.push('TELEGRAM_CHAT_ID inválido: execute npm run telegram:id.');
  }
  return erros;
}

module.exports = { validarConfiguracao };
