import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { canManageGuild } from '../lib/logger.js';
import {
  getSecurityReport,
  addToBlacklist,
  isUserBlacklisted,
} from '../lib/security.js';
import {
  addIPToBlacklist,
  removeIPFromBlacklist,
  getIPBlacklistStats,
  syncIPsFromFolder,
} from '../lib/ipBlacklist.js';

export const data = new SlashCommandBuilder()
  .setName('security')
  .setDescription('Gerenciar segurança e visualizar relatórios')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sc) =>
    sc
      .setName('report')
      .setDescription('Mostrar relatório completo de segurança'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('blacklist')
      .setDescription('Gerenciar blacklist de usuários')
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Ação para realizar')
          .setRequired(true)
          .addChoices(
            { name: 'Adicionar usuário', value: 'add' },
            { name: 'Remover usuário', value: 'remove' },
            { name: 'Listar usuários', value: 'list' },
          ),
      )
      .addStringOption((option) =>
        option
          .setName('user')
          .setDescription('ID do usuário Discord')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Motivo da blacklist')
          .setRequired(false),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('showips')
      .setDescription('Ver IPs conectados recentemente'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('ip')
      .setDescription('Gerenciar blacklist de IPs')
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Ação para realizar')
          .setRequired(true)
          .addChoices(
            { name: 'Adicionar IP', value: 'add' },
            { name: 'Remover IP', value: 'remove' },
            { name: 'Listar IPs', value: 'list' },
            { name: 'Sincronizar IPs', value: 'sync' },
          ),
      )
      .addStringOption((option) =>
        option
          .setName('ip')
          .setDescription('Endereço IP')
          .setRequired(false),
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Motivo da blacklist')
          .setRequired(false),
      ),
  );

export async function execute(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: '❌ **Acesso negado:** Você precisa de **Administrador** para usar este comando.',
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'report') {
    const report = await getSecurityReport();

    const embed = new EmbedBuilder()
      .setTitle('🔒 Relatório de Segurança')
      .setColor(0x5865F2)
      .addFields(
        {
          name: '📊 Estatísticas Gerais',
          value: `**Total de acessos:** ${report.totalAccesses}\n` +
            `**Usuários únicos:** ${report.uniqueUsers}\n` +
            `**IPs únicas:** ${report.uniqueIPs}\n` +
            `**Usuários banidos:** ${report.blacklistedUsers}\n` +
            `**IPs suspeitas:** ${report.suspiciousIPs}`,
          inline: false,
        },
        {
          name: '⚠️ Top Usuários Suspeitos',
          value: report.topSuspiciousUsers
            .map((user, index) =>
              `**${index + 1}.** <@${user.userId}> (Score: ${user.suspiciousScore})\n` +
              `   Acessos: ${user.accessCount} | IPs: ${user.uniqueIPs}`
            )
            .join('\n\n') || 'Nenhum usuário suspeito',
          inline: false,
        },
        {
          name: '🕐 Atividade Recente',
          value: report.recentActivity
            .map(log =>
              `<t:${Math.floor(new Date(log.timestamp).getTime() / 1000)}>` +
              `**${log.location}** - ${log.userId} (IP: ${log.ip})`
            )
            .join('\n') || 'Nenhuma atividade recente',
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'Sistema de Segurança v1.0' });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  if (sub === 'blacklist') {
    const action = interaction.options.getString('action');
    const userId = interaction.options.getString('user');
    const reason = interaction.options.getString('reason') || 'Motivo não especificado';

    if (action === 'list') {
      const blacklist = await isUserBlacklisted(userId);
      // Na verdade, vamos carregar a blacklist completa
      const { loadBlacklist } = await import('../lib/security.js');
      const blacklistData = await loadBlacklist();

      const embed = new EmbedBuilder()
        .setTitle('🚫 Blacklist de Usuários')
        .setColor(0xFF0000)
        .setDescription(`**Total de usuários banidos:** ${blacklistData.users.length}`)
        .addFields(
          ...blacklistData.users.map((uid, index) => ({
            name: `${index + 1}. <@${uid}>`,
            value: `**Motivo:** ${blacklistData.reasons[uid]?.reason || 'Não especificado'}\n` +
              `**Adicionado por:** ${blacklistData.reasons[uid]?.addedBy || 'Sistema'}\n` +
              `**Data:** ${blacklistData.reasons[uid]?.addedAt ? new Date(blacklistData.reasons[uid].addedAt).toLocaleString('pt-BR') : 'Desconhecido'}`,
            inline: false,
          }))
        )
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

    if (action === 'add') {
      if (!userId) {
        return interaction.reply({
          content: '❌ **Erro:** Você precisa fornecer o ID do usuário para adicionar à blacklist.',
          ephemeral: true,
        });
      }

      const success = await addToBlacklist(userId, reason, interaction.user.tag);

      if (success) {
        return interaction.reply({
          content: `✅ **Usuário adicionado à blacklist:** <@${userId}>\n` +
            `**Motivo:** ${reason}\n` +
            `**Adicionado por:** ${interaction.user.tag}`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `❌ **Erro:** Usuário <@${userId}> já está na blacklist.`,
          ephemeral: true,
        });
      }
    }

    if (action === 'remove') {
      if (!userId) {
        return interaction.reply({
          content: '❌ **Erro:** Você precisa fornecer o ID do usuário para remover da blacklist.',
          ephemeral: true,
        });
      }

      // Implementar remoção da blacklist
      const { loadBlacklist, saveBlacklist } = await import('../lib/security.js');
      const blacklistData = await loadBlacklist();

      if (blacklistData.users.includes(userId)) {
        blacklistData.users = blacklistData.users.filter(uid => uid !== userId);
        delete blacklistData.reasons[userId];
        await saveBlacklist(blacklistData);

        return interaction.reply({
          content: `✅ **Usuário removido da blacklist:** <@${userId}>`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `❌ **Erro:** Usuário <@${userId}> não está na blacklist.`,
          ephemeral: true,
        });
      }
    }
  }

  if (sub === 'ip') {
    const action = interaction.options.getString('action');
    const ip = interaction.options.getString('ip');
    const reason = interaction.options.getString('reason') || 'Motivo não especificado';

    if (action === 'list') {
      const stats = await getIPBlacklistStats();
      const { loadIPBlacklist } = await import('../lib/ipBlacklist.js');
      const blacklist = await loadIPBlacklist();

      const embed = new EmbedBuilder()
        .setTitle('🚫 Blacklist de IPs')
        .setColor(0xFF0000)
        .setDescription(`**Total de IPs banidos:** ${stats.totalBlacklisted}`)
        .addFields(
          ...blacklist.ips.slice(0, 25).map((ipAddr, index) => ({
            name: `${index + 1}. ${ipAddr}`,
            value: `**Motivo:** ${blacklist.reasons[ipAddr]?.reason || 'Não especificado'}\n` +
              `**Adicionado por:** ${blacklist.reasons[ipAddr]?.addedBy || 'Sistema'}\n` +
              `**Data:** ${blacklist.reasons[ipAddr]?.addedAt ? new Date(blacklist.reasons[ipAddr].addedAt).toLocaleString('pt-BR') : 'Desconhecido'}`,
            inline: false,
          }))
        );

      if (blacklist.ips.length > 25) {
        embed.addFields({
          name: '⚠️ Mais IPs',
          value: `E mais ${blacklist.ips.length - 25} IPs não mostrados.`,
          inline: false,
        });
      }

      if (stats.lastSync) {
        embed.addFields({
          name: '🔄 Última Sincronização',
          value: stats.lastSync,
          inline: false,
        });
      }

      embed.setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

    if (action === 'add') {
      if (!ip) {
        return interaction.reply({
          content: '❌ **Erro:** Você precisa fornecer o endereço IP para adicionar à blacklist.',
          ephemeral: true,
        });
      }

      // Validar formato do IP
      const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (!ipRegex.test(ip)) {
        return interaction.reply({
          content: '❌ **Erro:** Formato de IP inválido. Use o formato: xxx.xxx.xxx.xxx',
          ephemeral: true,
        });
      }

      const success = await addIPToBlacklist(ip, reason, interaction.user.tag);

      if (success) {
        return interaction.reply({
          content: `✅ **IP adicionado à blacklist:** \`${ip}\`\n` +
            `**Motivo:** ${reason}\n` +
            `**Adicionado por:** ${interaction.user.tag}`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `❌ **Erro:** IP \`${ip}\` já está na blacklist.`,
          ephemeral: true,
        });
      }
    }

    if (action === 'remove') {
      if (!ip) {
        return interaction.reply({
          content: '❌ **Erro:** Você precisa fornecer o endereço IP para remover da blacklist.',
          ephemeral: true,
        });
      }

      const success = await removeIPFromBlacklist(ip, interaction.user.tag);

      if (success) {
        return interaction.reply({
          content: `✅ **IP removido da blacklist:** \`${ip}\`\n` +
            `**Removido por:** ${interaction.user.tag}`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `❌ **Erro:** IP \`${ip}\` não está na blacklist.`,
          ephemeral: true,
        });
      }
    }

    if (action === 'sync') {
      await interaction.deferReply({ ephemeral: true });

      const result = await syncIPsFromFolder();

      const embed = new EmbedBuilder()
        .setTitle('🔄 Sincronização de IPs')
        .setColor(0x5865F2)
        .addFields(
          {
            name: '📊 Resultados',
            value: `**Arquivos processados:** ${result.synced}\n` +
              `**IPs encontrados:** ${result.created}\n` +
              `**IPs adicionados à blacklist:** ${result.blacklisted}`,
            inline: false,
          }
        )
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
      });
    }
  }
}
