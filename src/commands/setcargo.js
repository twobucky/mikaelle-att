import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { canManageGuild } from '../lib/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setcargo')
  .setDescription('Atribui um cargo a um usuário')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addUserOption((option) =>
    option
      .setName('usuario')
      .setDescription('Usuário que receberá o cargo')
      .setRequired(true),
  )
  .addRoleOption((option) =>
    option
      .setName('cargo')
      .setDescription('Cargo para atribuir')
      .setRequired(true),
  );

export async function execute(interaction) {
  // Verificar permissões
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: '❌ **Acesso negado:** Você precisa de **Gerir Cargos** para usar este comando.',
      ephemeral: true,
    });
  }

  const targetUser = interaction.options.getUser('usuario');
  const targetRole = interaction.options.getRole('cargo');
  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!member) {
    return interaction.reply({
      content: '❌ **Erro:** Não foi possível encontrar o usuário no servidor.',
      ephemeral: true,
    });
  }

  // Verificar se o bot tem permissão para gerenciar o cargo
  const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.reply({
      content: '❌ **Erro:** Eu não tenho permissão para gerenciar cargos.',
      ephemeral: true,
    });
  }

  // Verificar se o usuário pode gerenciar o cargo alvo
  if (targetRole.position >= botMember.roles.highest.position) {
    return interaction.reply({
      content: `❌ **Erro:** Não posso atribuir o cargo **${targetRole.name}** porque está acima ou na mesma posição que meu cargo mais alto.`,
      ephemeral: true,
    });
  }

  // Verificar se o usuário pode atribuir o cargo alvo
  if (targetRole.position >= interaction.member.roles.highest.position) {
    return interaction.reply({
      content: `❌ **Erro:** Você não pode atribuir o cargo **${targetRole.name}** porque está acima ou na mesma posição que seu cargo mais alto.`,
      ephemeral: true,
    });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    // Verificar se o usuário já tem o cargo
    if (member.roles.cache.has(targetRole.id)) {
      return interaction.editReply({
        content: `ℹ️ **Informação:** ${targetUser} já possui o cargo **${targetRole.name}**.`,
      });
    }

    // Adicionar o cargo
    await member.roles.add(targetRole.id);

    await interaction.editReply({
      content: `✅ **Sucesso:** Cargo **${targetRole.name}** atribuído a ${targetUser} com sucesso!`,
    });
  } catch (error) {
    let errorMessage = '❌ **Erro ao atribuir cargo:** ';
    errorMessage += error.message || 'Ocorreu um erro desconhecido.';
    
    await interaction.editReply({
      content: errorMessage,
      ephemeral: true,
    });
  }
}
