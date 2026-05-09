import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { canManageGuild } from '../lib/logger.js';
import {
  loadAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  listAllowedUsers,
} from '../lib/allowedUsers.js';

const SNOWFLAKE = /^\d{17,20}$/;

function parseId(interaction) {
  const raw = interaction.options.getString('id', true)?.trim() ?? '';
  if (!SNOWFLAKE.test(raw)) return null;
  return raw;
}

export const data = new SlashCommandBuilder()
  .setName('manageusers')
  .setDescription('Gerenciar usuários permitidos para acessar o painel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sc) =>
    sc
      .setName('add')
      .setDescription('Adicionar usuário permitido pelo ID')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID do Discord do usuário')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('remove')
      .setDescription('Remover usuário permitido pelo ID')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID do Discord do usuário')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc.setName('list').setDescription('Listar todos os usuários permitidos'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('addcurrent')
      .setDescription('Adicionar você mesmo à lista de permitidos'),
  );

export async function execute(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: 'Precisas de **Administrador** para usar este comando.',
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({
        content: '**ID inválido.** Cola só o snowflake (17–20 números).',
        ephemeral: true,
      });
    }

    try {
      // Tentar obter informações do usuário
      const user = await interaction.client.users.fetch(id);
      const success = await addAllowedUser(id, user.tag, interaction.user.tag);
      
      if (success) {
        return interaction.reply({
          content: `✅ **Usuário adicionado:** ${user.tag} (\`${id}\`)`,
          ephemeral: true,
        });
      }
    } catch (error) {
      return interaction.reply({
        content: `❌ **Erro:** Não foi possível encontrar o usuário com ID \`${id}\``,
        ephemeral: true,
      });
    }
  }

  if (sub === 'remove') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({
        content: '**ID inválido.**',
        ephemeral: true,
      });
    }

    const success = await removeAllowedUser(id);
    if (success) {
      return interaction.reply({
        content: `✅ **Usuário removido:** \`${id}\``,
        ephemeral: true,
      });
    } else {
      return interaction.reply({
        content: `❌ **Erro:** Usuário \`${id}\` não encontrado na lista.`,
        ephemeral: true,
      });
    }
  }

  if (sub === 'list') {
    const users = await listAllowedUsers();
    
    if (users.length === 0) {
      return interaction.reply({
        content: '📋 **Nenhum usuário permitido** encontrado.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('👥 Usuários Permitidos')
      .setColor(0x5865F2)
      .setDescription(`Total: **${users.length}** usuários`)
      .setTimestamp();

    users.forEach((user, index) => {
      embed.addFields({
        name: `${index + 1}. ${user.tag}`,
        value: `**ID:** \`${user.id}\`\n**Adicionado por:** ${user.addedBy}\n**Data:** ${new Date(user.addedAt).toLocaleString('pt-BR')}`,
        inline: false,
      });
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  if (sub === 'addcurrent') {
    const success = await addAllowedUser(interaction.user.id, interaction.user.tag, 'self-add');
    
    if (success) {
      return interaction.reply({
        content: `✅ **Você foi adicionado** à lista de usuários permitidos!`,
        ephemeral: true,
      });
    } else {
      return interaction.reply({
        content: `❌ **Erro:** Você já está na lista de usuários permitidos.`,
        ephemeral: true,
      });
    }
  }
}
