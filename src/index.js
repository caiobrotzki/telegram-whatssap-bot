'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { encontrarCodigosNaImagem, fecharOCR } = require('./ocr');
const { enviarAlerta } = require('./telegram');
const { carregarHistorico, registrar } = require('./historico');

const listarGrupos = process.argv.includes('--listar-grupos');
const idGrupo = process.env.WHATSAPP_GROUP_ID?.trim();
const { validarConfiguracao } = require('./config');

if (!listarGrupos) {
  const erros = validarConfiguracao(process.env);
  if (erros.length) {
    console.error(erros.join('\n'));
    console.error('Edite o .env. Para descobrir o ID do grupo: npm run grupos');
    process.exit(1);
  }
}

const historico = listarGrupos ? null : carregarHistorico();
const cliente = new Client({ authStrategy: new LocalAuth() });
let fila = Promise.resolve();
let encerrando = false;

cliente.on('qr', qr => {
  console.log('Escaneie o QR Code em WhatsApp > Dispositivos conectados:');
  qrcode.generate(qr, { small: true });
});

cliente.on('auth_failure', erro => console.error('Falha na autenticação do WhatsApp:', erro));
cliente.on('disconnected', motivo => console.warn('WhatsApp desconectado:', motivo));

cliente.on('ready', async () => {
  console.log('WhatsApp conectado!');

  if (listarGrupos) {
    try {
      const chats = await cliente.getChats();
      const grupos = chats.filter(chat => chat.isGroup);
      if (!grupos.length) console.log('Nenhum grupo encontrado na lista de conversas carregadas.');
      for (const grupo of grupos) {
        console.log(`${grupo.name}\n  ID: ${grupo.id._serialized}`);
      }
    } catch (erro) {
      console.error('Erro ao listar grupos:', erro.message);
    } finally {
      await cliente.destroy();
    }
  } else {
    console.log(`Monitorando somente novas imagens do grupo: ${idGrupo}`);
  }
});

const { criarProcessador } = require('./processador');
const processarMensagem = criarProcessador({ idGrupo, historico, encontrarCodigosNaImagem, enviarAlerta, registrar });

cliente.on('message_create', mensagem => {
  if (listarGrupos || encerrando) return;
  // Uma fila evita vários reconhecimentos simultâneos no mesmo worker de OCR.
  fila = fila.then(() => processarMensagem(mensagem)).catch(erro => {
    console.error('Erro ao processar imagem:', erro.message);
  });
});

async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  console.log('Encerrando...');
  try {
    await fila;
    await fecharOCR();
    await cliente.destroy();
  } catch (erro) {
    console.error('Erro ao encerrar:', erro.message);
  }
  process.exit(0);
}

process.once('SIGINT', encerrar);
process.once('SIGTERM', encerrar);

cliente.initialize().catch(erro => {
  console.error('Não foi possível iniciar WhatsApp Web:', erro.message);
  process.exitCode = 1;
});
