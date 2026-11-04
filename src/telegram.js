'use strict';

async function executarTelegram(metodo, parametros = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN não configurado no .env');

  const resposta = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parametros),
    signal: AbortSignal.timeout(15000)
  });

  const dados = await resposta.json();
  if (!resposta.ok || !dados.ok) {
    throw new Error(`Telegram: ${dados.description || 'falha na requisição'}`);
  }

  return dados.result;
}

async function enviarAlerta(codigos) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID não configurado no .env');

  const formatados = codigos.map(codigo => `<code>${codigo}</code>`).join('\n');
  const mensagem = [
    '🎮 Possível código PSN encontrado em imagem do grupo!',
    '',
    formatados,
    '',
    '⚠️ Confira com a imagem original: OCR pode confundir letras e números.'
  ].join('\n');

  return executarTelegram('sendMessage', {
    chat_id: chatId,
    text: mensagem,
    parse_mode: 'HTML'
  });
}

module.exports = { executarTelegram, enviarAlerta };
