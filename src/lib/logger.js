import {
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';

const COLOR = {
  info: 0x5865f2,
  warn: 0xf0b232,
  danger: 0xed4245,
  success: 0x57f287,
};

export async function sendModLog(guild, settings, embed) {
  const id = settings.logChannelId;
  if (!id) return;
  const ch = guild.channels.cache.get(id);
  if (!ch || !ch.isTextBased()) return;
  try {
    await ch.send({ embeds: [embed] });
  } catch {
    /* ignorar canal sem permissão */
  }
}

export function logEmbed(title, description, kind = 'info') {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description.slice(0, 4090))
    .setColor(COLOR[kind] ?? COLOR.info)
    .setTimestamp();
}

/**
 * Aplica lockdown: nega enviar mensagens para @everyone em canais de texto visíveis.
 */
export async function setLockdown(guild, active) {
  const everyone = guild.roles.everyone;
  let changed = 0;
  for (const ch of guild.channels.cache.values()) {
    if (
      ch.type !== ChannelType.GuildText &&
      ch.type !== ChannelType.GuildAnnouncement
    ) {
      continue;
    }
    try {
      await ch.permissionOverwrites.edit(everyone, {
        SendMessages: active ? false : null,
      });
      changed++;
    } catch {
      /* sem permissão neste canal */
    }
  }
  return changed;
}

/**
 * Permissão para /config, lockdown, painel de tickets.
 * Usa os dados da interação (mais fiável que member.permissions em slash commands).
 */
export function canManageGuild(interaction) {
  if (!interaction.guild || !interaction.inGuild()) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const perms = interaction.memberPermissions;
  if (!perms) return false;
  return (
    perms.has(PermissionFlagsBits.Administrator) ||
    perms.has(PermissionFlagsBits.ManageGuild)
  );
}

export function isStaff(member, settings) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (
    settings.ticketStaffRoleId &&
    member.roles.cache.has(settings.ticketStaffRoleId)
  ) {
    return true;
  }
  return false;
}
