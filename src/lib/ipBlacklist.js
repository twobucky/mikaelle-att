import fs from 'fs/promises';
import path from 'path';

const IP_BLACKLIST_FILE = path.join(process.cwd(), 'data', 'ip-blacklist.json');
const IP_LOG_FILE = path.join(process.cwd(), 'data', 'ip-access.log');

// Carregar blacklist de IPs
export async function loadIPBlacklist() {
  try {
    const data = await fs.readFile(IP_BLACKLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { ips: [], reasons: {} };
  }
}

// Salvar blacklist de IPs
export async function saveIPBlacklist(blacklist) {
  try {
    const dir = path.dirname(IP_BLACKLIST_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(IP_BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
  } catch (error) {
    console.error('[IPBlacklist] Erro ao salvar blacklist:', error);
  }
}

// Adicionar IP à blacklist
export async function addIPToBlacklist(ip, reason, addedBy) {
  const blacklist = await loadIPBlacklist();
  
  if (!blacklist.ips.includes(ip)) {
    blacklist.ips.push(ip);
    blacklist.reasons[ip] = {
      reason,
      addedBy,
      addedAt: new Date().toISOString()
    };
    
    await saveIPBlacklist(blacklist);
    
    // Log da adição
    const logEntry = `[${new Date().toISOString()}] IP_BLACKLIST_ADDED: ${ip} | Reason: ${reason} | Added by: ${addedBy}\n`;
    await fs.appendFile(IP_LOG_FILE, logEntry);
    
    return true;
  }
  
  return false;
}

// Remover IP da blacklist
export async function removeIPFromBlacklist(ip, removedBy) {
  const blacklist = await loadIPBlacklist();
  
  if (blacklist.ips.includes(ip)) {
    blacklist.ips = blacklist.ips.filter(ips => ips !== ip);
    delete blacklist.reasons[ip];
    
    await saveIPBlacklist(blacklist);
    
    // Log da remoção
    const logEntry = `[${new Date().toISOString()}] IP_BLACKLIST_REMOVED: ${ip} | Removed by: ${removedBy}\n`;
    await fs.appendFile(IP_LOG_FILE, logEntry);
    
    return true;
  }
  
  return false;
}

// Verificar se IP está na blacklist
export function isIPBlacklisted(ip) {
  return loadIPBlacklist().then(blacklist => blacklist.ips.includes(ip));
}

// Sincronizar IPs da pasta com a blacklist
export async function syncIPsFromFolder() {
  const ipFolder = path.join(process.cwd(), 'data', 'ips');
  
  try {
    // Verificar se a pasta existe
    if (!fs.existsSync(ipFolder)) {
      await fs.mkdir(ipFolder, { recursive: true });
      return { synced: 0, created: 0, blacklisted: 0 };
    }
    
    // Ler todos os arquivos de IP da pasta
    const ipFiles = await fs.readdir(ipFolder);
    let synced = 0;
    let created = 0;
    let blacklisted = 0;
    
    for (const file of ipFiles) {
      if (file.endsWith('.txt') || file.endsWith('.ip')) {
        try {
          const filePath = path.join(ipFolder, file);
          const content = await fs.readFile(filePath, 'utf8');
          const ips = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && line.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/));
          
          for (const ip of ips) {
            const isBlacklisted = await addIPToBlacklist(ip, 'Encontrado na pasta de IPs', 'sync_system');
            if (isBlacklisted) {
              blacklisted++;
            }
            created++;
          }
          
          synced++;
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file}:`, error);
        }
      }
    }
    
    const logEntry = `[${new Date().toISOString()}] IP_SYNC: Processed ${synced} files, ${created} IPs found, ${blacklisted} added to blacklist\n`;
    await fs.appendFile(IP_LOG_FILE, logEntry);
    
    return { synced, created, blacklisted };
  } catch (error) {
    console.error('[IPBlacklist] Erro ao sincronizar IPs:', error);
    return { synced: 0, created: 0, blacklisted: 0 };
  }
}

// Obter estatísticas da blacklist de IPs
export async function getIPBlacklistStats() {
  const blacklist = await loadIPBlacklist();
  const logContent = await fs.readFile(IP_LOG_FILE, 'utf8').catch(() => '');
  
  const logLines = logContent.split('\n').filter(line => line.trim());
  const recentLogs = logLines.slice(-20);
  
  return {
    totalBlacklisted: blacklist.ips.length,
    recentLogs,
    reasons: blacklist.reasons,
    lastSync: recentLogs.filter(line => line.includes('IP_SYNC')).pop()
  };
}
