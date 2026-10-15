"use strict";

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const GRUPO_ID = "120363414085493461@g.us";
const RESPOSTA = "1";

// Aqui declaramos o estado inicial do bot
let pronto = false; 
let pausadoPorErro = false;
let encerrando = false;
let inicioMonitoramento = 0;
let fila = Promise.resolve();

// Função auxiliar para gravar no arquivo de logger
function registrarLog(textoMensagem, classificacao) {
    const dataHora = new Date().toISOString();
    const mensagemLimpa = String(textoMensagem).replace(/[\r\n]+/g, " ");
    const linhaLog = `[${dataHora}] | Mensagem: "${mensagemLimpa}" | Resposta: ${classificacao}\n`;
    
    // Alterado para recuar uma pasta (..) e guardar na raiz
    fs.appendFile(path.join(__dirname, '..', 'mensagens.log'), linhaLog, (err) => {
        if (err) console.error('Erro ao salvar o log:', err);
    });
}

function log(mensagem) {
  console.log(`[${new Date().toLocaleString("pt-BR")}] ${mensagem}`);
}

function mostrarErro(contexto, erro) {
  console.error(contexto);
  console.error(erro?.stack ?? erro);
}

function temLanceLivre(texto) {
  const normalizado = String(texto ?? "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[*_~`]/g, "");

  return normalizado.split("\n").some((linha) => {
    const limpa = linha.trim().toLowerCase();
    return limpa.includes("lance inicial") && limpa.includes("livre");
  });
}

// --- CONFIGURAÇÃO ATUALIZADA DO CLIENT ---
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: path.join(__dirname, '..', '.sessao-whatsapp'),
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      // '--single-process', // <-- COMENTE OU APAGUE ESTA LINHA
      '--disable-gpu'
    ]
  },
});

client.on("qr", (qr) => {
  pronto = false; // Aqui ele desativa o bot enquanto aguarda o QR Code
  log("Escaneie em WhatsApp > Aparelhos conectados:");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  log("Autenticado! Aguardando o WhatsApp carregar...");
});

client.on("loading_screen", (percent, mensagem) => {
  log(`Carregando: ${percent}% | ${mensagem}`);
  if (Number(percent) >= 100) {
    log("WhatsApp 100% carregado!");
    inicioMonitoramento = Math.floor(Date.now() / 1000);
    pronto = true; // Bot ativado!
    log(`Bot ativo no grupo ID: ${GRUPO_ID}`);
    log('Novos anúncios com "Lance inicial: LIVRE" receberão "1".');
  }
});

client.on("ready", () => {
  if (encerrando || pausadoPorErro) return;
  if (!/^\d+(?:-\d+)?@g\.us$/.test(GRUPO_ID)) {
    pronto = false;
    console.error("GRUPO_ID inválido.");
    return;
  }
  
  log("WhatsApp pronto! Sincronizando conexões...");
  
  setTimeout(() => {
    if (!pronto) {
      inicioMonitoramento = Math.floor(Date.now() / 1000);
      pronto = true; // Bot ativado por segurança caso a tela de carregamento falhe
      log("WhatsApp pronto e monitoramento ativado por segurança!");
      log(`Bot ativo no grupo ID: ${GRUPO_ID}`);
    }
  }, 5000);
});

async function processarMensagem(msg) {
  if (!pronto || pausadoPorErro || encerrando) return;
  if (msg.fromMe || msg.from !== GRUPO_ID) return;

  log(`Analisando mensagem de ${msg.author || msg.from}: \n--- TEXTO ---\n${msg.body}\n------------`);

  // Ignora mensagens anteriores à ativação do bot com base no timestamp
  if (!msg.timestamp || msg.timestamp <= inicioMonitoramento) {
    log("-> Ignorado: Mensagem anterior à ativação do bot.");
    return;
  }

  // Verifica se possui o lance livre
  if (!temLanceLivre(msg.body)) {
    log("-> Ignorado: Não possui 'lance inicial livre'.");
    registrarLog(msg.body, "NEGATIVO");
    return;
  }

  const titulo = String(msg.body ?? "")
    .split(/\r?\n/)[0]
    .slice(0, 140);

  log(`Lance livre identificado com sucesso: ${titulo}`);
  log(`Aguardando 3 segundos antes de enviar o lance...`);

  // --- ADICIONE O TEMPO AQUI (3000 = 3 segundos, 5000 = 5 segundos, etc.) ---
  await new Promise(resolve => setTimeout(resolve, 3000));
  // -------------------------------------------------------------------------

  await client.sendMessage(GRUPO_ID, RESPOSTA); // <--- AQUI A MENSAGEM É ENVIADA
  log(`[ENVIADO "${RESPOSTA}"] Item: "${titulo}" | ID da mensagem: ${msg.id?._serialized}`);
  
  registrarLog(msg.body, "POSITIVO");
}

client.on("message", (msg) => {
  console.log(`Mensagem recebida no grupo ${msg.from}: ${msg.body}`);
  if (msg.from === GRUPO_ID) {
    log(`[RASTREAMENTO] Mensagem recebida no grupo.`);
  }

  if (!pronto || pausadoPorErro || encerrando) return;
  if (msg.fromMe || msg.from !== GRUPO_ID) return;

  fila = fila
    .then(() => processarMensagem(msg))
    .catch((erro) => {
      pronto = false; // Em caso de erro na fila, desativa o bot
      pausadoPorErro = true;
      mostrarErro(
        "Falha ao enviar. Bot pausado. Confira o grupo antes de reiniciar.",
        erro
      );
    });
});

client.on("auth_failure", (mensagem) => {
  pronto = false; // Desativa se a autenticação falhar
  log(`Falha de autenticação: ${mensagem}`);
});

client.on("disconnected", (motivo) => {
  pronto = false; // Desativa se o WhatsApp desconectar
  log(`WhatsApp desconectado: ${motivo}`);
  log("Reinicie o programa para conectar novamente.");
});

process.once("SIGINT", async () => {
  encerrando = true;
  pronto = false; // Desativa durante o encerramento
  log("Encerrando o bot...");
  const limite = setTimeout(() => process.exit(1), 10000);
  limite.unref();
  try {
    await client.destroy();
    clearTimeout(limite);
    process.exit(0);
  } catch (erro) {
    mostrarErro("Erro ao encerrar:", erro);
    process.exit(1);
  }
});

client.initialize().catch((erro) => {
  pronto = false; // Desativa se der erro ao ligar
  mostrarErro("Erro ao iniciar o WhatsApp:", erro);
  process.exitCode = 1;
});

// --- CONFIGURAÇÃO PARA DEPLOY EM NUVEM (RENDER) ---
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot de WhatsApp Rodando Ativamente!');
});

app.listen(PORT, () => {
    console.log(`Servidor web ouvindo na porta ${PORT}`);
});