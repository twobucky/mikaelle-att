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
            ` **${log.location}** - ${log.userId}`
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
}
