import { getGuildSettings } from './storage.js';

/** Intervalo entre mensagens (evita rate limit do Discord). */
const TICK_MS = 1_500;

const timers = new Map();

export function unscheduleSpamMsgForGuild(guildId) {
  const t = timers.get(guildId);
  if (t) {
    clearInterval(t);
    timers.delete(guildId);
  }
}

/**
 * Envia menções aos IDs configurados no canal configurado, em loop, até desligares.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Snowflake} guildId
 */
export function scheduleSpamMsgForGuild(client, guildId) {
  const st = getGuildSettings(guildId);
  if (
    !st.spamMsgEnabled ||
    !st.spamMsgChannelId ||
    !(st.spamMsgUserIds?.length)
  ) {
    unscheduleSpamMsgForGuild(guildId);
    return;
  }

  unscheduleSpamMsgForGuild(guildId);

  const tick = async () => {
    const cur = getGuildSettings(guildId);
    if (
      !cur.spamMsgEnabled ||
      !cur.spamMsgChannelId ||
      !(cur.spamMsgUserIds?.length)
    ) {
      unscheduleSpamMsgForGuild(guildId);
      return;
    }
    const ch = await client.channels.fetch(cur.spamMsgChannelId).catch(() => null);
    if (!ch?.isTextBased?.()) return;
    const ids = cur.spamMsgUserIds;
    const content = ids.map((id) => `<@${id}>`).join(' ');
    await ch
      .send({
        content,
        allowedMentions: { users: ids },
      })
      .catch(() => { });
  };

  void tick();
  timers.set(guildId, setInterval(tick, TICK_MS));
}

export function bootstrapSpamMsgJobs(client) {
  for (const id of client.guilds.cache.keys()) {
    const st = getGuildSettings(id);
    if (
      st.spamMsgEnabled &&
      st.spamMsgChannelId &&
      (st.spamMsgUserIds?.length)
    ) {
      scheduleSpamMsgForGuild(client, id);
    }
  }
}

export function stopAllSpamMsgJobs() {
  for (const gid of [...timers.keys()]) {
    unscheduleSpamMsgForGuild(gid);
  }
}
