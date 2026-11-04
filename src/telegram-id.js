'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { executarTelegram } = require('./telegram');

(async () => {
  const atualizacoes = await executarTelegram('getUpdates', { limit: 100, timeout: 0 });
  const mensagensPrivadas = atualizacoes
    .map(item => item.message)
    .filter(item => item?.chat?.type === 'private');

  if (!mensagensPrivadas.length) {
    console.log('Não encontrei conversas privadas. Abra seu bot no Telegram, envie /start e tente novamente.');
    return;
  }

  const chats = new Map(mensagensPrivadas.map(item => [item.chat.id, item.chat]));
  for (const chat of chats.values()) {
    console.log(`Chat ID: ${chat.id} | ${chat.first_name || ''} ${chat.username ? '@' + chat.username : ''}`);
  }
  console.log('Copie o ID da SUA conversa para TELEGRAM_CHAT_ID no .env.');
})().catch(erro => {
  console.error(erro.message);
  process.exitCode = 1;
});
