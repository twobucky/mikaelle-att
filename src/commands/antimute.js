import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { setGuildSettings, getGuildSettings } from '../lib/storage.js';
import { canManageGuild } from '../lib/logger.js';
import { sendFunctionNotification } from '../lib/dmNotifier.js';

const SNOWFLAKE = /^\d{17,20}$/;

function parseId(interaction) {
  const raw = interaction.options.getString('id', true)?.trim() ?? '';
  if (!SNOWFLAKE.test(raw)) return null;
  return raw;
}

export const data = new SlashCommandBuilder()
  .setName('antimute')
  .setDescription(
    'Proteção: coloca o ID — o bot remove mute de servidor, surdo e timeout aplicados por outros',
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sc) =>
    sc
      .setName('add')
      .setDescription('Adicionar conta pelo ID do Discord')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID (botão direito no utilizador → Copiar ID)')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('remove')
      .setDescription('Remover um ID da lista')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID a remover')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc.setName('list').setDescription('Ver IDs protegidos'),
  )
  .addSubcommand((sc) =>
    sc.setName('clear').setDescription('Limpar a lista de proteção'),
  );

export async function execute(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content:
        'Precisas de **Administrador** / **Gerir servidor**.',
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  const cur = getGuildSettings(interaction.guildId);
  let ids = [...(cur.antiMuteUserIds ?? [])];

  if (sub === 'add') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({
        content: '**ID inválido.** Cola só o snowflake (17–20 números).',
        ephemeral: true,
      });
    }
    if (!ids.includes(id)) ids.push(id);
    setGuildSettings(interaction.guildId, { antiMuteUserIds: ids });

    // Enviar notificação DM
    await sendFunctionNotification(
      interaction.user,
      'Anti-Mute',
      'usuário adicionado',
      `ID: \`${id}\`\nTotal protegidos: ${ids.length}\nProteção: Remove mute/surdo/timeout`,
      interaction.guild
    );

    return interaction.reply({
      content: `**Anti-mute:** \`${id}\` protegido.`,
      ephemeral: true,
    });
  }

  if (sub === 'remove') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({
        content: '**ID inválido.**',
        ephemeral: true,
      });
    }
    ids = ids.filter((x) => x !== id);
    setGuildSettings(interaction.guildId, { antiMuteUserIds: ids });

    // Enviar notificação DM
    await sendFunctionNotification(
      interaction.user,
      'Anti-Mute',
      'usuário removido',
      `ID: \`${id}\`\nTotal protegidos: ${ids.length}`,
      interaction.guild
    );

    return interaction.reply({
      content: `**Anti-mute:** \`${id}\` removido.`,
      ephemeral: true,
    });
  }

  if (sub === 'list') {
    if (ids.length === 0) {
      return interaction.reply({
        content:
          '**Anti-mute:** nenhum ID. Usa `/antimute add` e cola o **id**.',
        ephemeral: true,
      });
    }
    const lines = await Promise.all(
      ids.map(async (id) => {
        try {
          const m = await interaction.guild.members.fetch(id);
          return `• ${m.user.tag} — \`${id}\``;
        } catch {
          return `• (membro não encontrado) — \`${id}\``;
        }
      }),
    );
    return interaction.reply({
      content: `**Anti-mute** (${ids.length}):\n${lines.join('\n')}`,
      ephemeral: true,
    });
  }

  if (sub === 'clear') {
    const previousCount = ids.length;
    setGuildSettings(interaction.guildId, { antiMuteUserIds: [] });

    // Enviar notificação DM
    await sendFunctionNotification(
      interaction.user,
      'Anti-Mute',
      'lista limpa',
      `Removidos: ${previousCount} usuários\nTotal protegidos: 0`,
      interaction.guild
    );

    return interaction.reply({
      content: '**Anti-mute:** lista limpa.',
      ephemeral: true,
    });
  }
}
