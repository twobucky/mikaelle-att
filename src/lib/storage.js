import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readJson(file, fallback) {
  ensureDir();
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(file, obj) {
  ensureDir();
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(obj, null, 2));
}

export function defaultGuildSettings() {
  return {
    logChannelId: null,
    ticketCategoryId: null,
    ticketPanelChannelId: null,
    ticketStaffRoleId: null,
    antiraidEnabled: false,
    antiraidJoinThreshold: 10,
    antiraidWindowSeconds: 12,
    antiraidMinAccountDays: 0,
    antiraidLockdownOnRaid: true,
    lockdownActive: false,
    /** IDs de utilizadores que o bot tenta manter sem mute de servidor em voz / timeout */
    antiMuteUserIds: [],
    /** Modo spam mute: quando true, IDs em spamMuteUserIds são voltados a mutar / timeout */
    spamMuteEnabled: false,
    spamMuteUserIds: [],
    /** Menções repetidas num canal até desligar (spammsg) */
    spamMsgEnabled: false,
    spamMsgUserIds: [],
    spamMsgChannelId: null,
  };
}

export function getGuildSettings(guildId) {
  const all = readJson('guilds.json', {});
  return { ...defaultGuildSettings(), ...all[guildId] };
}

export function setGuildSettings(guildId, patch) {
  const all = readJson('guilds.json', {});
  all[guildId] = { ...defaultGuildSettings(), ...all[guildId], ...patch };
  writeJson('guilds.json', all);
  return all[guildId];
}

export function addWarn(guildId, userId, moderatorId, reason) {
  const all = readJson('warns.json', {});
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) all[guildId][userId] = [];
  const entry = {
    moderatorId,
    reason: reason?.trim() || 'Sem motivo',
    at: Date.now(),
  };
  all[guildId][userId].push(entry);
  writeJson('warns.json', all);
  return entry;
}

export function getWarns(guildId, userId) {
  const all = readJson('warns.json', {});
  return all[guildId]?.[userId] ?? [];
}

export function clearWarns(guildId, userId) {
  const all = readJson('warns.json', {});
  if (all[guildId]?.[userId]) {
    delete all[guildId][userId];
    writeJson('warns.json', all);
  }
}

export function registerTicket(channelId, guildId, userId) {
  const all = readJson('tickets.json', {});
  all[channelId] = {
    guildId,
    userId,
    openedAt: Date.now(),
    closed: false,
  };
  writeJson('tickets.json', all);
}

export function getTicket(channelId) {
  return readJson('tickets.json', {})[channelId] ?? null;
}

export function closeTicketRecord(channelId) {
  const all = readJson('tickets.json', {});
  if (all[channelId]) {
    all[channelId].closed = true;
    all[channelId].closedAt = Date.now();
    writeJson('tickets.json', all);
  }
}
