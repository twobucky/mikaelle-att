import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { setGuildSettings, getGuildSettings } from '../lib/storage.js';
import { canManageGuild } from '../lib/logger.js';
import {
  scheduleSpamMsgForGuild,
  unscheduleSpamMsgForGuild,
} from '../lib/spamMessageLoop.js';
import { sendFunctionNotification } from '../lib/dmNotifier.js';

const SNOWFLAKE = /^\d{17,20}$/;

function parseId(interaction) {
  const raw = interaction.options.getString('id', true)?.trim() ?? '';
  if (!SNOWFLAKE.test(raw)) return null;
  return raw;
}

export const data = new SlashCommandBuilder()
  .setName('spammsg')
  .setDescription(
    'Marca menções repetidas a IDs num canal até desligares (ou parar o bot)',
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sc) =>
    sc
      .setName('canal')
      .setDescription('Canal onde o bot vai enviar as menções')
      .addChannelOption((o) =>
        o
          .setName('canal')
          .setDescription('Canal de texto')
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
          )
          .setRequired(true),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('add')
      .setDescription('Adicionar ID a marcar')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID do Discord')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('adduser')
      .setDescription('Adicionar usuário a marcar')
      .addUserOption((o) =>
        o
          .setName('usuario')
          .setDescription('Usuário para adicionar')
          .setRequired(true),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('remove')
      .setDescription('Remover um ID')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc.setName('list').setDescription('Canal, IDs e se o loop está ativo'),
  )
  .addSubcommand((sc) =>
    sc.setName('clear').setDescription('Apagar todos os IDs (para o loop se estava ativo)'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('ligar')
      .setDescription('Começa a marcar em loop (~30s entre mensagens)'),
  )
  .addSubcommand((sc) =>
    sc.setName('desligar').setDescription('Para as menções automáticas'),
  );

export async function execute(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content: 'Precisas de **Gerir servidor** / **Administrador**.',
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();
  const cur = getGuildSettings(interaction.guildId);
  let ids = [...(cur.spamMsgUserIds ?? [])];

  if (sub === 'canal') {
    const canal = interaction.options.getChannel('canal', true);
    setGuildSettings(interaction.guildId, { spamMsgChannelId: canal.id });
    if (cur.spamMsgEnabled) {
      scheduleSpamMsgForGuild(interaction.client, interaction.guildId);
    }
    return interaction.reply({
      content: `**Spam mensagem:** canal → ${canal}.`,
      ephemeral: true,
    });
  }

  if (sub === 'add') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({
        content: '**ID inválido.**',
        ephemeral: true,
      });
    }
    if (!ids.includes(id)) ids.push(id);
    setGuildSettings(interaction.guildId, { spamMsgUserIds: ids });
    if (getGuildSettings(interaction.guildId).spamMsgEnabled) {
      scheduleSpamMsgForGuild(interaction.client, interaction.guildId);
    }
    return interaction.reply({
      content: `**Spam mensagem:** \`${id}\` na lista.`,
      ephemeral: true,
    });
  }

  if (sub === 'adduser') {
    const user = interaction.options.getUser('usuario', true);
    const id = user.id;
    if (!ids.includes(id)) ids.push(id);
    setGuildSettings(interaction.guildId, { spamMsgUserIds: ids });
    if (getGuildSettings(interaction.guildId).spamMsgEnabled) {
      scheduleSpamMsgForGuild(interaction.client, interaction.guildId);
    }
    return interaction.reply({
      content: `**Spam mensagem:** ${user.tag} (\`${id}\`) na lista.`,
      ephemeral: true,
    });
  }

  if (sub === 'remove') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({ content: '**ID inválido.**', ephemeral: true });
    }
    ids = ids.filter((x) => x !== id);
    const patch = { spamMsgUserIds: ids };
    if (ids.length === 0) {
      patch.spamMsgEnabled = false;
      unscheduleSpamMsgForGuild(interaction.guildId);
    }
    setGuildSettings(interaction.guildId, patch);
    if (
      ids.length > 0 &&
      getGuildSettings(interaction.guildId).spamMsgEnabled
    ) {
      scheduleSpamMsgForGuild(interaction.client, interaction.guildId);
    }
    return interaction.reply({
      content: `**Spam mensagem:** \`${id}\` removido.`,
      ephemeral: true,
    });
  }

  if (sub === 'list') {
    const ch = cur.spamMsgChannelId
      ? await interaction.guild.channels.fetch(cur.spamMsgChannelId).catch(() => null)
      : null;
    const on = cur.spamMsgEnabled;
    const chLabel = ch ? `${ch}` : '`não definido — /spammsg canal`';
    if (ids.length === 0) {
      return interaction.reply({
        content:
          `**Spam mensagem** ${on ? '(ligado mas sem IDs)' : '(desligado)'}\n` +
          `Canal: ${chLabel}\nLista vazia — \`/spammsg add\``,
        ephemeral: true,
      });
    }
    const lines = await Promise.all(
      ids.map(async (id) => {
        try {
          const m = await interaction.guild.members.fetch(id);
          return `• ${m.user.tag} — \`${id}\``;
        } catch {
          return `• (fora do servidor) — \`${id}\``;
        }
      }),
    );
    return interaction.reply({
      content:
        `**Spam mensagem** ${on ? '**ATIVO**' : '(desligado)'}\n` +
        `Canal: ${chLabel}\n` +
        lines.join('\n'),
      ephemeral: true,
    });
  }

  if (sub === 'clear') {
    setGuildSettings(interaction.guildId, {
      spamMsgUserIds: [],
      spamMsgEnabled: false,
    });
    unscheduleSpamMsgForGuild(interaction.guildId);
    return interaction.reply({
      content: '**Spam mensagem:** lista limpa e modo desligado.',
      ephemeral: true,
    });
  }

  if (sub === 'ligar') {
    const st = getGuildSettings(interaction.guildId);
    const list = st.spamMsgUserIds ?? [];
    if (!st.spamMsgChannelId) {
      return interaction.reply({
        content:
          'Define primeiro o canal: **`/spammsg canal`**.',
        ephemeral: true,
      });
    }
    if (list.length === 0) {
      return interaction.reply({
        content: 'Adiciona IDs: **`/spammsg add`**.',
        ephemeral: true,
      });
    }
    setGuildSettings(interaction.guildId, { spamMsgEnabled: true });
    scheduleSpamMsgForGuild(interaction.client, interaction.guildId);

    // Enviar notificação DM
    const channel = await interaction.guild.channels.fetch(st.spamMsgChannelId).catch(() => null);
    const details = `Canal: ${channel ? channel.name : 'Canal não encontrado'}\nIDs na lista: ${list.length}\nIntervalo: ~30 segundos`;
    await sendFunctionNotification(
      interaction.user,
      'Spam Mensagem',
      'ligado',
      details,
      interaction.guild
    );

    return interaction.reply({
      content:
        '**Spam mensagem ligado.** Uma mensagem já vai (ou foi) enviada; depois ~**30 s** entre cada. **`/spammsg desligar`** ou parar o bot para parar.',
      ephemeral: true,
    });
  }

  if (sub === 'desligar') {
    setGuildSettings(interaction.guildId, { spamMsgEnabled: false });
    unscheduleSpamMsgForGuild(interaction.guildId);

    // Enviar notificação DM
    await sendFunctionNotification(
      interaction.user,
      'Spam Mensagem',
      'desligado',
      'Loop de mensagens interrompido',
      interaction.guild
    );

    return interaction.reply({
      content: '**Spam mensagem desligado.**',
      ephemeral: true,
    });
  }
}
