/** Timeout máximo permitido pelo Discord (28 dias). */
export const SPAM_MUTE_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

export function isSpamMuteTarget(settings, userId) {
  return (
    Boolean(settings.spamMuteEnabled) &&
    (settings.spamMuteUserIds ?? []).includes(userId)
  );
}

/**
 * Aplica mute de servidor em voz (se estiver em call) - sem timeout.
 * @param {import('discord.js').GuildMember} member
 */
export async function enforceSpamMuteMember(member) {
  if (member.voice?.channel) {
    await member.voice.setMute(true).catch(() => { });
  }
}

/**
 * Reaplica mute a todos os IDs da lista (ao ligar o modo no servidor).
 * @param {import('discord.js').Guild} guild
 * @param {object} settings — `{ spamMuteEnabled, spamMuteUserIds }`
 */
export async function enforceSpamMuteAllForGuild(guild, settings) {
  const ids = settings.spamMuteUserIds ?? [];
  if (!settings.spamMuteEnabled || ids.length === 0) return;
  for (const id of ids) {
    const m = await guild.members.fetch(id).catch(() => null);
    if (m) await enforceSpamMuteMember(m);
  }
}

/**
 * Remove mute de servidor em voz (se estiver em call).
 * @param {import('discord.js').GuildMember} member
 */
export async function removeSpamMuteFromMember(member) {
  if (member.voice?.channel) {
    await member.voice.setMute(false).catch(() => { });
  }
}

/**
 * Remove mute de todos os IDs da lista (ao desligar o modo no servidor).
 * @param {import('discord.js').Guild} guild
 * @param {object} settings — `{ spamMuteUserIds }`
 */
export async function removeSpamMuteAllFromGuild(guild, settings) {
  const ids = settings.spamMuteUserIds ?? [];
  if (ids.length === 0) return;
  for (const id of ids) {
    const m = await guild.members.fetch(id).catch(() => null);
    if (m) await removeSpamMuteFromMember(m);
  }
}
