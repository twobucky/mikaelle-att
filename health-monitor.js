import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HEALTH_FILE = join(__dirname, 'data', 'bot-health.json');

function log(message) {
  const timestamp = new Date().toLocaleString('pt-BR');
  console.log(`[${timestamp}] [HEALTH] ${message}`);
}

function updateHealth(status) {
  try {
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };

    // Garante que o diretório data existe
    const dir = dirname(HEALTH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(HEALTH_FILE, JSON.stringify(healthData, null, 2));
    log(`📊 Saúde atualizada: ${status}`);
  } catch (error) {
    log(`❌ Erro ao atualizar saúde: ${error.message}`);
  }
}

function getHealth() {
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8'));
      return data;
    }
  } catch (error) {
    log(`❌ Erro ao ler saúde: ${error.message}`);
  }
  return null;
}

// Monitoramento contínuo
let lastHeartbeat = Date.now();

function heartbeat() {
  lastHeartbeat = Date.now();
  updateHealth('online');
}

// Verificar se o bot está respondendo
function checkBotResponse() {
  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeat;
  
  if (timeSinceLastHeartbeat > 60000) { // 1 minuto sem heartbeat
    log('⚠️ Bot não respondeu há mais de 1 minuto');
    updateHealth('unresponsive');
  }
}

// Exportar funções para uso no bot principal
export { heartbeat, updateHealth, getHealth, checkBotResponse };

// Se executado diretamente, mostra status atual
if (import.meta.url === `file://${process.argv[1]}`) {
  const health = getHealth();
  if (health) {
    console.log('📊 Status do Bot:');
    console.log(`Status: ${health.status}`);
    console.log(`Última atualização: ${new Date(health.timestamp).toLocaleString('pt-BR')}`);
    console.log(`Uptime: ${Math.floor(health.uptime / 60)} minutos`);
    console.log(`Memória: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`);
  } else {
    console.log('❌ Nenhum dado de saúde encontrado');
  }
}
