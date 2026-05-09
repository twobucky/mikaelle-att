import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { clearWarns, getGuildSettings } from '../lib/storage.js';
import { sendModLog, logEmbed } from '../lib/logger.js';

export const data = new SlashCommandBuilder()
  .setName('clearwarns')
  .setDescription('Remove todos os avisos de um membro')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName('membro').setDescription('Utilizador').setRequired(true),
  );

export async function execute(interaction) {
  const membro = interaction.options.getUser('membro', true);
  const settings = getGuildSettings(interaction.guildId);

  clearWarns(interaction.guildId, membro.id);

  await interaction.reply({
    content: `Avisos de ${membro.tag} foram limpos.`,
    ephemeral: true,
  });

  await sendModLog(
    interaction.guild,
    settings,
    logEmbed(
      'Avisos limpos',
      `**Membro:** ${membro.tag} (${membro.id})\n**Moderador:** ${interaction.user.tag}`,
      'info',
    ),
  );
}
