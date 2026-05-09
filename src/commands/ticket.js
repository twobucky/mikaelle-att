import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getGuildSettings } from '../lib/storage.js';
import { canManageGuild, isStaff } from '../lib/logger.js';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Sistema de tickets de suporte')
  .addSubcommand((sc) =>
    sc
      .setName('painel')
      .setDescription('Publica o painel com botão neste canal (só gestão)'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('fechar')
      .setDescription('Fecha o ticket atual (staff ou autor)'),
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const settings = getGuildSettings(interaction.guildId);

  if (sub === 'painel') {
    if (!canManageGuild(interaction)) {
      return interaction.reply({
        content: 'Precisas de **Gerir servidor**.',
        ephemeral: true,
      });
    }
    if (!settings.ticketCategoryId || !settings.ticketStaffRoleId) {
      return interaction.reply({
        content:
          'Configura primeiro com `/config tickets` (categoria, painel e staff).',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Suporte')
      .setDescription(
        'Clica no botão abaixo para abrir um ticket privado com a equipa.\n' +
          'Um canal será criado só para ti e para a staff.',
      )
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('Abrir ticket')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({
      content: 'Painel publicado.',
      ephemeral: true,
    });
    return interaction.channel.send({ embeds: [embed], components: [row] });
  }

  if (sub === 'fechar') {
    const ticketData = (await import('../lib/storage.js')).getTicket(
      interaction.channelId,
    );
    if (!ticketData || ticketData.closed) {
      return interaction.reply({
        content: 'Este canal não é um ticket aberto.',
        ephemeral: true,
      });
    }

    const isAuthor = ticketData.userId === interaction.user.id;
    const staffOk = isStaff(interaction.member, settings);
    if (!isAuthor && !staffOk) {
      return interaction.reply({
        content: 'Só o autor do ticket ou a staff podem fechar.',
        ephemeral: true,
      });
    }

    await interaction.reply({ content: 'A fechar ticket em 3 segundos…' });
    (await import('../lib/storage.js')).closeTicketRecord(
      interaction.channelId,
    );
    setTimeout(() => {
      interaction.channel.delete('Ticket fechado').catch(() => {});
    }, 3000);
  }
}
