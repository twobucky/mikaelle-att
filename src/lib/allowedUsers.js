import fs from 'fs/promises';
import path from 'path';

const ALLOWED_USERS_FILE = path.join(process.cwd(), 'data', 'allowedUsers.json');

/** Carrega usuários permitidos do arquivo */
export async function loadAllowedUsers() {
  try {
    const data = await fs.readFile(ALLOWED_USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('[AllowedUsers] Arquivo não encontrado, criando novo...');
    return {};
  }
}

/** Salva usuários permitidos no arquivo */
export async function saveAllowedUsers(users) {
  try {
    // Garante que o diretório data existe
    const dir = path.dirname(ALLOWED_USERS_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(ALLOWED_USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`[AllowedUsers] Salvo ${Object.keys(users).length} usuários permitidos`);
  } catch (error) {
    console.error('[AllowedUsers] Erro ao salvar usuários:', error);
  }
}

/** Verifica se um usuário está na lista de permitidos */
export function isUserAllowed(userId) {
  // Para compatibilidade, verifica também o sistema antigo
  const raw = process.env.ADMIN_PANEL_USER_IDS?.trim();
  if (raw) {
    const ids = raw.split(/[\s,]+/).filter(Boolean);
    if (ids.includes(userId)) return true;
  }
  
  // TODO: Implementar verificação no novo sistema
  return false;
}

/** Adiciona um usuário à lista de permitidos */
export async function addAllowedUser(userId, tag, addedBy) {
  const users = await loadAllowedUsers();
  users[userId] = {
    tag,
    addedBy,
    addedAt: new Date().toISOString()
  };
  await saveAllowedUsers(users);
  return true;
}

/** Remove um usuário da lista de permitidos */
export async function removeAllowedUser(userId) {
  const users = await loadAllowedUsers();
  if (users[userId]) {
    delete users[userId];
    await saveAllowedUsers(users);
    return true;
  }
  return false;
}

/** Lista todos os usuários permitidos */
export async function listAllowedUsers() {
  const users = await loadAllowedUsers();
  return Object.entries(users).map(([id, info]) => ({
    id,
    ...info
  }));
}
