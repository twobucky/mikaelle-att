import fs from 'fs/promises';
import path from 'path';
import { syncIPsFromFolder } from './ipBlacklist.js';

const SECURITY_FILE = path.join(process.cwd(), 'data', 'security.json');
const BLACKLIST_FILE = path.join(process.cwd(), 'data', 'blacklist.json');

// Carregar dados de segurança
export async function loadSecurityData() {
  try {
    const data = await fs.readFile(SECURITY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      accessLogs: [],
      suspiciousIPs: {},
      flaggedUsers: {}
    };
  }
}

// Salvar dados de segurança
export async function saveSecurityData(data) {
  try {
    const dir = path.dirname(SECURITY_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(SECURITY_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[Security] Erro ao salvar dados:', error);
  }
}

// Carregar blacklist
export async function loadBlacklist() {
  try {
    const data = await fs.readFile(BLACKLIST_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      users: [],
      ips: [],
      reasons: {}
    };
  }
}

// Salvar blacklist
export async function saveBlacklist(blacklist) {
  try {
    const dir = path.dirname(BLACKLIST_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(BLACKLIST_FILE, JSON.stringify(blacklist, null, 2));
  } catch (error) {
    console.error('[Security] Erro ao salvar blacklist:', error);
  }
}

// Registrar acesso com IP
export async function logAccess(userId, ip, userAgent) {
  const data = await loadSecurityData();

  const accessEntry = {
    userId,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    location: 'admin_panel'
  };

  data.accessLogs.push(accessEntry);

  // Manter apenas últimos 1000 acessos
  if (data.accessLogs.length > 1000) {
    data.accessLogs = data.accessLogs.slice(-1000);
  }

  await saveSecurityData(data);

  // Sincronizar IPs da pasta após cada acesso
  await syncIPsFromFolder();

  return accessEntry;
}

// Verificar se usuário está na blacklist
export async function isUserBlacklisted(userId) {
  const blacklist = await loadBlacklist();
  return blacklist.users.includes(userId);
}

// Verificar se IP está suspeito
export async function isIPSuspicious(ip) {
  const data = await loadSecurityData();
  const ipSuspicious = data.suspiciousIPs[ip] || false;

  // Verificar também na blacklist de IPs
  const { loadIPBlacklist } = await import('./ipBlacklist.js');
  const ipBlacklist = await loadIPBlacklist();
  const ipBlacklisted = ipBlacklist.ips.includes(ip);

  return ipSuspicious || ipBlacklisted;
}

// Adicionar usuário à blacklist
export async function addToBlacklist(userId, reason, addedBy) {
  const blacklist = await loadBlacklist();

  if (!blacklist.users.includes(userId)) {
    blacklist.users.push(userId);
    blacklist.reasons[userId] = {
      reason,
      addedBy,
      addedAt: new Date().toISOString()
    };

    await saveBlacklist(blacklist);
    return true;
  }

  return false;
}

// Detectar comportamento suspeito
export async function detectSuspiciousActivity(userId, ip, action) {
  const data = await loadSecurityData();
  const now = Date.now();

  // Inicializar dados do usuário
  if (!data.flaggedUsers[userId]) {
    data.flaggedUsers[userId] = {
      accessCount: 0,
      uniqueIPs: new Set(),
      lastAccess: null,
      suspiciousScore: 0
    };
  }

  const userData = data.flaggedUsers[userId];

  // Incrementar contadores
  userData.accessCount++;
  userData.uniqueIPs.add(ip);
  userData.lastAccess = now;

  // Calcular score de suspeita
  let suspiciousScore = 0;

  // Múltiplos IPs em curto período
  if (userData.uniqueIPs.size > 3) {
    suspiciousScore += 20;
  }

  // Muitos acessos em pouco tempo
  const recentAccesses = data.accessLogs.filter(log =>
    log.userId === userId && (now - new Date(log.timestamp).getTime()) < 3600000 // 1 hora
  );

  if (recentAccesses.length > 10) {
    suspiciousScore += 15;
  }

  // Ações suspeitas
  if (action === 'multiple_failed_logins') {
    suspiciousScore += 25;
  }

  userData.suspiciousScore = suspiciousScore;

  // Adicionar à blacklist automaticamente se score > 50
  if (suspiciousScore > 50) {
    await addToBlacklist(userId, 'Comportamento suspeito detectado automaticamente', 'security_system');

    // Marcar IP como suspeito
    if (!data.suspiciousIPs[ip]) {
      data.suspiciousIPs[ip] = {
        firstSeen: new Date().toISOString(),
        reason: 'Usuário com comportamento suspeito',
        associatedUsers: [userId]
      };
    } else {
      data.suspiciousIPs[ip].associatedUsers.push(userId);
    }
  }

  await saveSecurityData(data);

  return {
    suspiciousScore,
    isBlacklisted: suspiciousScore > 50,
    uniqueIPs: userData.uniqueIPs.size,
    accessCount: userData.accessCount
  };
}

// Obter relatório de segurança
export async function getSecurityReport() {
  const data = await loadSecurityData();
  const blacklist = await loadBlacklist();

  return {
    totalAccesses: data.accessLogs.length,
    uniqueUsers: new Set(data.accessLogs.map(log => log.userId)).size,
    uniqueIPs: new Set(data.accessLogs.map(log => log.ip)).size,
    blacklistedUsers: blacklist.users.length,
    suspiciousIPs: Object.keys(data.suspiciousIPs).length,
    recentActivity: data.accessLogs.slice(-10),
    topSuspiciousUsers: Object.entries(data.flaggedUsers)
      .sort(([, a], [, b]) => b.suspiciousScore - a.suspiciousScore)
      .slice(0, 5)
      .map(([userId, userData]) => ({
        userId,
        suspiciousScore: userData.suspiciousScore,
        accessCount: userData.accessCount,
        uniqueIPs: userData.uniqueIPs.size
      }))
  };
}
