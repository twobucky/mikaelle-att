import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let botProcess = null;
let restartCount = 0;
const MAX_RESTARTS_PER_HOUR = 10;
let restartTimes = [];

function log(message) {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log(`[${timestamp}] [24H] ${message}`);
}

function canRestart() {
  const now = Date.now();
  // Remove restarts antigos (mais de 1 hora)
  restartTimes = restartTimes.filter(time => now - time < 3600000);
  
  if (restartTimes.length >= MAX_RESTARTS_PER_HOUR) {
    log(`❌ Limite de restarts atingido (${restartTimes.length}/hora). Aguardando...`);
    return false;
  }
  
  restartTimes.push(now);
  return true;
}

function startBot() {
  if (!canRestart()) {
    // Espera 1 hora antes de tentar novamente
    setTimeout(startBot, 3600000);
    return;
  }

  restartCount++;
  log(`🚀 Iniciando bot (restart #${restartCount})`);

  botProcess = spawn('node', ['src/index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env
  });

  botProcess.on('close', (code) => {
    if (code === 0) {
      log('✅ Bot encerrado normalmente');
      process.exit(0);
    } else {
      log(`❌ Bot crashou com código ${code}`);
      log('🔄 Reiniciando em 5 segundos...');
      setTimeout(startBot, 5000);
    }
  });

  botProcess.on('error', (error) => {
    log(`❌ Erro ao iniciar bot: ${error.message}`);
    log('🔄 Tentando novamente em 10 segundos...');
    setTimeout(startBot, 10000);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('📡 Recebido SIGINT, encerrando...');
  if (botProcess) {
    botProcess.kill('SIGINT');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('📡 Recebido SIGTERM, encerrando...');
  if (botProcess) {
    botProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Iniciar o bot
log('🤖 Sistema 24H iniciado');
startBot();
