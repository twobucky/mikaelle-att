import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildSettings, setGuildSettings } from '../lib/storage.js';
import {
  setLockdown,
  sendModLog,
  logEmbed,
  canManageGuild,
} from '../lib/logger.js';
import { sendFunctionNotification } from '../lib/dmNotifier.js';

export const data = new SlashCommandBuilder()
  .setName('lockdown')
  .setDescription('Bloqueia ou desbloqueia o envio de mensagens para todos')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addBooleanOption((o) =>
    o
      .setName('ativo')
      .setDescription('true = bloquear mensagens; false = restaurar')
      .setRequired(true),
  );

export async function execute(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: 'Precisas de **Gerir servidor**.',
      ephemeral: true,
    });
  }

  const ativo = interaction.options.getBoolean('ativo', true);
  await interaction.deferReply({ ephemeral: true });

  const changed = await setLockdown(interaction.guild, ativo);
  setGuildSettings(interaction.guildId, { lockdownActive: ativo });

  await interaction.editReply({
    content: ativo
      ? `Lockdown **ativado**. Canais alterados: ${changed}.`
      : `Lockdown **desativado**. Canais restaurados: ${changed}.`,
  });

  // Enviar notificação DM
  await sendFunctionNotification(
    interaction.user,
    'Lockdown',
    ativo ? 'ativado' : 'desativado',
    `Canais afetados: ${changed}\nTipo: ${ativo ? 'Bloqueio de envio de mensagens' : 'Restauração de permissões'}`,
    interaction.guild
  );

  const settings = getGuildSettings(interaction.guildId);
  await sendModLog(
    interaction.guild,
    settings,
    logEmbed(
      ativo ? 'Lockdown ativado' : 'Lockdown desativado',
      `**Por:** ${interaction.user.tag}\n**Canais afetados:** ${changed}`,
      ativo ? 'danger' : 'success',
    ),
  );
}
