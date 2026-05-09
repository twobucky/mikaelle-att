import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { setGuildSettings, getGuildSettings } from '../lib/storage.js';
import { canManageGuild } from '../lib/logger.js';
import {
  enforceSpamMuteAllForGuild,
  removeSpamMuteAllFromGuild,
} from '../lib/spamMute.js';
import { sendFunctionNotification } from '../lib/dmNotifier.js';

const SNOWFLAKE = /^\d{17,20}$/;

function parseId(interaction) {
  const raw = interaction.options.getString('id', true)?.trim() ?? '';
  if (!SNOWFLAKE.test(raw)) return null;
  return raw;
}

export const data = new SlashCommandBuilder()
  .setName('spammute')
  .setDescription(
    'Spam mute: o bot volta a aplicar mute na call e timeout até desligares o modo',
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sc) =>
    sc
      .setName('add')
      .setDescription('Adicionar ID à lista de spam mute')
      .addStringOption((o) =>
        o
          .setName('id')
          .setDescription('ID da conta (botão direito → Copiar ID)')
          .setRequired(true)
          .setMinLength(17)
          .setMaxLength(20),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('adduser')
      .setDescription('Adicionar usuário à lista de spam mute')
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
    sc.setName('list').setDescription('Lista de IDs e se o modo está ligado'),
  )
  .addSubcommand((sc) =>
    sc.setName('clear').setDescription('Apagar todos os IDs (não desliga o modo)'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('ligar')
      .setDescription('Ativa o spam mute e reaplica nos IDs da lista'),
  )
  .addSubcommand((sc) =>
    sc
      .setName('desligar')
      .setDescription('Desativa o spam mute (deixa de forçar mute/timeout)'),
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
  let ids = [...(cur.spamMuteUserIds ?? [])];

  if (sub === 'add') {
    const id = parseId(interaction);
    if (!id) {
      return interaction.reply({
        content: '**ID inválido.** Cola só números (17–20 caracteres).',
        ephemeral: true,
      });
    }
    if (!ids.includes(id)) ids.push(id);
    setGuildSettings(interaction.guildId, { spamMuteUserIds: ids });
    const st = getGuildSettings(interaction.guildId);
    if (st.spamMuteEnabled) {
      await enforceSpamMuteAllForGuild(interaction.guild, st);
    }
    return interaction.reply({
      content: `**Spam mute:** \`${id}\` na lista.` +
        (st.spamMuteEnabled
          ? ' Modo **ligado** — castigo reaplicado se a pessoa estiver no servidor.'
          : ' Usa `/spammute ligar` ou **mkadm spam ligar** no painel para começar a forçar mute.'),
      ephemeral: true,
    });
  }

  if (sub === 'adduser') {
    const user = interaction.options.getUser('usuario', true);
    const id = user.id;
    if (!ids.includes(id)) ids.push(id);
    setGuildSettings(interaction.guildId, { spamMuteUserIds: ids });
    const st = getGuildSettings(interaction.guildId);
    if (st.spamMuteEnabled) {
      await enforceSpamMuteAllForGuild(interaction.guild, st);
    }
    return interaction.reply({
      content: `**Spam mute:** ${user.tag} (\`${id}\`) na lista.` +
        (st.spamMuteEnabled
          ? ' Modo **ligado** — castigo reaplicado se a pessoa estiver no servidor.'
          : ' Usa `/spammute ligar` ou **mkadm spam ligar** no painel para começar a forçar mute.'),
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
    setGuildSettings(interaction.guildId, { spamMuteUserIds: ids });
    return interaction.reply({
      content: `**Spam mute:** \`${id}\` removido da lista.`,
      ephemeral: true,
    });
  }

  if (sub === 'list') {
    const on = cur.spamMuteEnabled;
    if (ids.length === 0) {
      return interaction.reply({
        content:
          `**Spam mute:** modo ${on ? '**ligado**' : '**desligado**'} — lista vazia.\nUsa \`/spammute add\` com o **id**.`,
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
        `**Spam mute** ${on ? '**ATIVO**' : '(desligado)'}\n` +
        lines.join('\n'),
      ephemeral: true,
    });
  }

  if (sub === 'clear') {
    setGuildSettings(interaction.guildId, { spamMuteUserIds: [] });
    return interaction.reply({
      content:
        '**Spam mute:** lista apagada (o modo ligado/desligado mantém-se igual).',
      ephemeral: true,
    });
  }

  if (sub === 'ligar') {
    setGuildSettings(interaction.guildId, { spamMuteEnabled: true });
    const st = getGuildSettings(interaction.guildId);
    await enforceSpamMuteAllForGuild(interaction.guild, st);

    // Enviar notificação DM
    const details = `IDs protegidos: ${ids.length}\nTipo: Mute forçado em call + timeout automático`;
    await sendFunctionNotification(
      interaction.user,
      'Spam Mute',
      'ligado',
      details,
      interaction.guild
    );

    return interaction.reply({
      content:
        `**Spam mute ligado.** ${ids.length ? `A reaplicar nos **${ids.length}** ID(s)…` : 'Lista vazia — usa `/spammute add` com **id**.'}`,
      ephemeral: true,
    });
  }

  if (sub === 'desligar') {
    setGuildSettings(interaction.guildId, { spamMuteEnabled: false });

    // Enviar notificação DM
    await sendFunctionNotification(
      interaction.user,
      'Spam Mute',
      'desligado',
      'Proteção contra mute/timeout removida',
      interaction.guild
    );

    return interaction.reply({
      content:
        '**Spam mute desligado.** O bot já não volta a forçar mute/timeout.',
      ephemeral: true,
    });
  }
}
