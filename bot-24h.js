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
  // Logs mínimos para não encher cache do Render
  if (message.includes('Sistema 24H iniciado') ||
    message.includes('Limite de restarts') ||
    message.includes('Bot encerrado')) {
    console.log(`[24H] ${message}`);
  }
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
  // Sem log de restart para não encher cache

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
      // Sem logs de crash para não encher cache
      setTimeout(startBot, 5000);
    }
  });

  botProcess.on('error', (error) => {
    // Sem logs de erro para não encher cache
    setTimeout(startBot, 10000);
  });
}

// Graceful shutdown (sem logs para não encher cache)
process.on('SIGINT', () => {
  if (botProcess) {
    botProcess.kill('SIGINT');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (botProcess) {
    botProcess.kill('SIGTERM');
  }
  process.exit(0);
});

// Iniciar o bot
log('🤖 Sistema 24H iniciado');
startBot();
