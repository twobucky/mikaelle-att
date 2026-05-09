import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { sendModLog, logEmbed } from '../lib/logger.js';
import { getGuildSettings } from '../lib/storage.js';

export const data = new SlashCommandBuilder()
  .setName('sendmsg')
  .setDescription('Envia uma mensagem em nome do bot para um canal específico')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addChannelOption((o) =>
    o
      .setName('canal')
      .setDescription('Canal onde a mensagem será enviada')
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      )
      .setRequired(true),
  )
  .addStringOption((o) =>
    o
      .setName('mensagem')
      .setDescription('Mensagem que o bot irá enviar')
      .setRequired(true)
      .setMaxLength(2000),
  );

export async function execute(interaction) {
  const canal = interaction.options.getChannel('canal', true);
  const mensagem = interaction.options.getString('mensagem', true);
  const guild = interaction.guild;
  const settings = getGuildSettings(guild.id);

  // Verificar se o bot tem permissão para enviar mensagens no canal
  const permissions = canal.permissionsFor(guild.members.me);
  if (!permissions.has(PermissionFlagsBits.SendMessages)) {
    return interaction.reply({
      content: '❌ **Erro:** O bot não tem permissão para enviar mensagens neste canal.',
      ephemeral: true,
    });
  }

  if (!permissions.has(PermissionFlagsBits.ViewChannel)) {
    return interaction.reply({
      content: '❌ **Erro:** O bot não tem permissão para ver este canal.',
      ephemeral: true,
    });
  }

  try {
    // Enviar a mensagem em nome do bot
    await canal.send(mensagem);

    // Confirmar para o usuário que a mensagem foi enviada
    await interaction.reply({
      content: `✅ **Mensagem enviada com sucesso** para ${canal}!`,
      ephemeral: true,
    });

    // Enviar log de moderação
    await sendModLog(
      guild,
      settings,
      logEmbed(
        'Mensagem enviada pelo bot',
        `**Canal:** ${canal} (\`${canal.id}\`)\n` +
        `**Autor do comando:** ${interaction.user.tag} (\`${interaction.user.id}\`)\n` +
        `**Mensagem:**\n${mensagem}`,
        'info',
      ),
    );
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    
    // Tentar editar a resposta se ainda não foi respondido
    if (!interaction.replied) {
      await interaction.reply({
        content: `❌ **Erro ao enviar mensagem:** ${error.message}`,
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: `❌ **Erro ao enviar mensagem:** ${error.message}`,
        ephemeral: true,
      });
    }
  }
}
