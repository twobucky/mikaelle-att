import crypto from 'crypto';
import {
  PANEL_MODAL_ID,
  FIELD_USER,
  FIELD_PASSWORD,
} from './panelModal.js';
import { isUserAllowed, addAllowedUser } from './allowedUsers.js';
import {
  logAccess,
  isUserBlacklisted,
  detectSuspiciousActivity,
  getSecurityReport
} from './security.js';

/** userId -> expira em ms desde epoch */
const sessions = new Map();

const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 h

export function setSession(userId, ttlMs = DEFAULT_TTL_MS) {
  sessions.set(userId, Date.now() + ttlMs);
}

export function clearSession(userId) {
  sessions.delete(userId);
}

export function hasValidSession(userId) {
  const exp = sessions.get(userId);
  if (!exp || Date.now() > exp) {
    sessions.delete(userId);
    return false;
  }
  return true;
}

export function verifyPanelSecret(input, secret) {
  if (typeof input !== 'string' || typeof secret !== 'string') return false;
  const ha = crypto.createHash('sha256').update(input, 'utf8').digest();
  const hb = crypto.createHash('sha256').update(secret, 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Utilizador + senha configurados no .env */
export function panelLoginConfigured() {
  return Boolean(
    process.env.PANEL_SECRET?.trim() && process.env.PANEL_USER?.trim(),
  );
}

/** Só o token do bot (legado): alguns checks antigos */
export function panelSecretConfigured() {
  return Boolean(process.env.PANEL_SECRET?.trim());
}

/** Verifica se usuário está permitido (novo sistema + legado) */
export async function isPanelUserAllowed(userId) {
  // Verifica sistema legado primeiro
  const raw = process.env.ADMIN_PANEL_USER_IDS?.trim();
  if (raw) {
    const ids = raw.split(/[\s,]+/).filter(Boolean);
    if (ids.includes(userId)) return true;
  }

  // Verifica novo sistema baseado em ID
  return await isUserAllowed(userId);
}

/**
 * Submit do modal de login (utilizador + senha).
 */
export async function handlePanelModalSubmit(interaction) {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== PANEL_MODAL_ID) return;

  if (!panelLoginConfigured()) {
    return interaction.reply({
      content:
        'Configura **PANEL_USER** e **PANEL_SECRET** no `.env` do bot e reinicia.',
      ephemeral: true,
    });
  }

  // Verificar blacklist primeiro
  const blacklisted = await isUserBlacklisted(interaction.user.id);
  if (blacklisted) {
    return interaction.reply({
      content: '❌ **Acesso negado:** Seu usuário está na blacklist por segurança.',
      ephemeral: true,
    });
  }

  if (!isPanelUserAllowed(interaction.user.id)) {
    return interaction.reply({
      content: 'O teu utilizador não está autorizado (ADMIN_PANEL_USER_IDS).',
      ephemeral: true,
    });
  }

  const userInput = interaction.fields.getTextInputValue(FIELD_USER).trim();
  const pwd = interaction.fields.getTextInputValue(FIELD_PASSWORD);
  const expectedUser = process.env.PANEL_USER.trim();
  const secret = process.env.PANEL_SECRET.trim();

  // Obter IP do usuário (Discord não fornece IP real, mas usamos o ID como referência)
  const userIP = interaction.user.id; // Como fallback, já que Discord não expõe IP real
  const userAgent = interaction.client.user.tag;

  // Registrar tentativa de acesso
  await logAccess(interaction.user.id, userIP, userAgent);

  const userOk = verifyPanelSecret(
    userInput.toLowerCase(),
    expectedUser.toLowerCase(),
  );
  const passOk = verifyPanelSecret(pwd, secret);

  if (userOk && passOk) {
    // Detectar atividade suspeita
    const securityCheck = await detectSuspiciousActivity(interaction.user.id, userIP, 'successful_login');

    setSession(interaction.user.id);

    let response = '**Sessão iniciada.** Repete o comando que querias usar (ex.: `/warn`, `/config`).';

    // Alertar sobre atividade suspeita
    if (securityCheck.suspiciousScore > 20) {
      response += '\n\n⚠️ **Alerta de segurança:** Atividade suspeita detectada.';
    }

    return interaction.reply({
      content: response,
      ephemeral: true,
    });
  } else {
    // Login falhou - registrar como atividade suspeita
    await detectSuspiciousActivity(interaction.user.id, userIP, 'failed_login');

    return interaction.reply({
      content: '❌ **Credenciais inválidas.** Verifique usuário e senha.',
      ephemeral: true,
    });
  }
}
