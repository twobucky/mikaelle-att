import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { addWarn, getWarns } from '../lib/storage.js';
import { sendModLog, logEmbed } from '../lib/logger.js';
import { getGuildSettings } from '../lib/storage.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Adiciona um aviso a um membro')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName('membro').setDescription('Utilizador').setRequired(true),
  )
  .addStringOption((o) =>
    o.setName('motivo').setDescription('Motivo do aviso').setMaxLength(500),
  );

export async function execute(interaction) {
  const membro = interaction.options.getUser('membro', true);
  const motivo = interaction.options.getString('motivo');
  const guild = interaction.guild;
  const settings = getGuildSettings(guild.id);

  if (membro.id === interaction.user.id) {
    return interaction.reply({
      content: 'Não podes avisar-te a ti próprio.',
      ephemeral: true,
    });
  }
  if (membro.bot) {
    return interaction.reply({
      content: 'Não é possível avisar bots desta forma.',
      ephemeral: true,
    });
  }

  addWarn(guild.id, membro.id, interaction.user.id, motivo ?? '');
  const count = getWarns(guild.id, membro.id).length;

  await interaction.reply({
    content: `${membro} foi avisado. Total de avisos: **${count}**.`,
  });

  await sendModLog(
    guild,
    settings,
    logEmbed(
      'Aviso aplicado',
      `**Membro:** ${membro.tag} (${membro.id})\n` +
        `**Moderador:** ${interaction.user.tag}\n` +
        `**Motivo:** ${motivo?.trim() || 'Sem motivo'}\n` +
        `**Total de avisos:** ${count}`,
      'warn',
    ),
  );
}
