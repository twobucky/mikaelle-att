import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import { getGuildSettings, setGuildSettings } from './storage.js';
import {
  hasValidSession,
  isPanelUserAllowed,
  panelLoginConfigured,
} from './panelSession.js';
import { buildLoginModal } from './panelModal.js';
import { enforceSpamMuteAllForGuild } from './spamMute.js';
import {
  scheduleSpamMsgForGuild,
  unscheduleSpamMsgForGuild,
} from './spamMessageLoop.js';

export const PANEL_CMP_PREFIX = 'mik_p_';

export const PanelIds = {
  NAV_MAIN: 'mik_p_nav_main',
  NAV_ANTI: 'mik_p_nav_anti',
  NAV_SPMUTE: 'mik_p_nav_spamute',
  NAV_SPAMSG: 'mik_p_nav_spamsg',
  AU_ADD: 'mik_p_au_add',
  AU_RM: 'mik_p_au_rm',
  AU_LIST: 'mik_p_au_list',
  AU_CLEAR: 'mik_p_au_clear',
  SPM_ADD: 'mik_p_spm_add',
  SPM_RM: 'mik_p_spm_rm',
  SPM_ON: 'mik_p_spm_on',
  SPM_OFF: 'mik_p_spm_off',
  SPM_INFO: 'mik_p_spm_info',
  SG_CH: 'mik_p_sg_ch',
  SG_UADD: 'mik_p_sg_uadd',
  SG_RM: 'mik_p_sg_rm',
  SG_ON: 'mik_p_sg_on',
  SG_OFF: 'mik_p_sg_off',
  SG_CLEAR: 'mik_p_sg_clear',
};

function deny(interaction, text) {
  return interaction.replied || interaction.deferred
    ? interaction.followUp({ content: text, ephemeral: true })
    : interaction.reply({ content: text, ephemeral: true });
}

async function ensureAccess(interaction) {
  if (!panelLoginConfigured()) {
    await deny(interaction, 'Define **PANEL_USER** e **PANEL_SECRET** no `.env`.');
    return false;
  }
  if (!isPanelUserAllowed(interaction.user.id)) {
    await deny(
      interaction,
      'O teu utilizador não está em **ADMIN_PANEL_USER_IDS**.',
    );
    return false;
  }
  if (!interaction.guildId) {
    await deny(interaction, 'Usa isto dentro de um servidor.');
    return false;
  }
  if (!hasValidSession(interaction.user.id)) {
    try {
      await interaction.showModal(buildLoginModal());
    } catch {
      await deny(interaction, 'Usa **`/mkadm login`** e volta a abrir o painel.');
    }
    return false;
  }
  return true;
}

async function buildRemoveOptions(guild, ids) {
  const slice = ids.slice(0, 25);
  const opts = [];
  for (const id of slice) {
    try {
      const m = await guild.members.fetch(id);
      opts.push({
        label: m.user.tag.slice(0, 100),
        value: id,
        description: id,
      });
    } catch {
      opts.push({
        label: `ID ${id}`.slice(0, 100),
        value: id,
      });
    }
  }
  return opts;
}

function embedMain(guildId) {
  const st = getGuildSettings(guildId);
  return new EmbedBuilder()
    .setTitle('Painel mikaelle')
    .setDescription(
      'Escolhe uma secção abaixo. **Só cliques e listas** — sem escrever comandos.\n\n' +
        `• **Anti-mute:** ${(st.antiMuteUserIds ?? []).length} ID(s)\n` +
        `• **Spam mute:** ${st.spamMuteEnabled ? '**ligado**' : 'desligado'} · ${(st.spamMuteUserIds ?? []).length} ID(s)\n` +
        `• **Spam mensagem:** ${st.spamMsgEnabled ? '**ligado**' : 'desligado'} · ${(st.spamMsgUserIds ?? []).length} ID(s)`,
    )
    .setColor(0x5865f2);
}

function rowsMain() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(PanelIds.NAV_ANTI)
        .setLabel('Anti-mute')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(PanelIds.NAV_SPMUTE)
        .setLabel('Spam mute')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(PanelIds.NAV_SPAMSG)
        .setLabel('Spam mensagem')
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

async function embedAntimute(guild) {
  const st = getGuildSettings(guild.id);
  const n = (st.antiMuteUserIds ?? []).length;
  return new EmbedBuilder()
    .setTitle('Anti-mute')
    .setDescription(
      '**Adicionar:** escolhe um membro na lista.\n**Remover:** menu abaixo (se houver IDs).\nO bot tira mute de servidor / surdo / timeout a quem está na lista.',
    )
    .setFooter({ text: `${n} ID(s) na lista` })
    .setColor(0x57f287);
}

async function rowsAntimute(guild) {
  const st = getGuildSettings(guild.id);
  const ids = st.antiMuteUserIds ?? [];

  const rowUser = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(PanelIds.AU_ADD)
      .setPlaceholder('Adicionar membro à proteção')
      .setMinValues(1)
      .setMaxValues(1),
  );

  const rows = [rowUser];

  if (ids.length > 0) {
    const opts = await buildRemoveOptions(guild, ids);
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(PanelIds.AU_RM)
          .setPlaceholder('Remover um ID da lista')
          .addOptions(opts),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(PanelIds.AU_LIST)
        .setLabel('Ver lista')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(PanelIds.AU_CLEAR)
        .setLabel('Limpar tudo')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(PanelIds.NAV_MAIN)
        .setLabel('← Início')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

async function embedSpammute(guild) {
  const st = getGuildSettings(guild.id);
  const on = st.spamMuteEnabled;
  return new EmbedBuilder()
    .setTitle('Spam mute')
    .setDescription(
      (on
        ? '**Modo ligado** — o bot volta a aplicar timeout (28d) e mute na call.\n'
        : '**Modo desligado.**\n') +
        'Adiciona ou remove membros abaixo. Depois **Ligar** / **Desligar**.',
    )
    .setFooter({
      text: `${(st.spamMuteUserIds ?? []).length} ID(s) · cargo do bot acima dos mods`,
    })
    .setColor(on ? 0xed4245 : 0x95a5a6);
}

async function rowsSpammute(guild) {
  const st = getGuildSettings(guild.id);
  const ids = st.spamMuteUserIds ?? [];

  const rows = [
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(PanelIds.SPM_ADD)
        .setPlaceholder('Adicionar à lista spam mute')
        .setMinValues(1)
        .setMaxValues(1),
    ),
  ];

  if (ids.length > 0) {
    const opts = await buildRemoveOptions(guild, ids);
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(PanelIds.SPM_RM)
          .setPlaceholder('Remover da lista')
          .addOptions(opts),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(PanelIds.SPM_ON)
        .setLabel('Ligar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(PanelIds.SPM_OFF)
        .setLabel('Desligar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(PanelIds.SPM_INFO)
        .setLabel('Estado')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(PanelIds.NAV_MAIN)
        .setLabel('← Início')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

async function embedSpamsg(guild) {
  const st = getGuildSettings(guild.id);
  const ch = st.spamMsgChannelId
    ? guild.channels.cache.get(st.spamMsgChannelId)
    : null;
  return new EmbedBuilder()
    .setTitle('Spam mensagem')
    .setDescription(
      '1. Escolhe o **canal** (menu abaixo).\n2. **Adiciona** quem mencionar.\n3. **Ligar** para ~30s entre mensagens.\n' +
        (ch
          ? `\n**Canal atual:** ${ch}`
          : '\n**Canal:** ainda não definido.'),
    )
    .setFooter({
      text: `${(st.spamMsgUserIds ?? []).length} ID(s) · ${st.spamMsgEnabled ? 'ATIVO' : 'parado'}`,
    })
    .setColor(st.spamMsgEnabled ? 0xfee75c : 0x95a5a6);
}

async function rowsSpamsg(guild) {
  const st = getGuildSettings(guild.id);
  const ids = st.spamMsgUserIds ?? [];

  const rows = [
    new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(PanelIds.SG_CH)
        .setPlaceholder('Canal das menções')
        .setChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement,
        )
        .setMinValues(1)
        .setMaxValues(1),
    ),
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(PanelIds.SG_UADD)
        .setPlaceholder('Adicionar menção')
        .setMinValues(1)
        .setMaxValues(1),
    ),
  ];

  if (ids.length > 0) {
    const opts = await buildRemoveOptions(guild, ids);
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(PanelIds.SG_RM)
          .setPlaceholder('Remover menção')
          .addOptions(opts),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(PanelIds.SG_ON)
        .setLabel('Ligar')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(PanelIds.SG_OFF)
        .setLabel('Desligar')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(PanelIds.SG_CLEAR)
        .setLabel('Limpar IDs')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(PanelIds.NAV_MAIN)
        .setLabel('← Início')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

/** Primeira abertura: resposta ephemeral com o menu principal. */
export async function openMainPanel(interaction) {
  if (!(await ensureAccess(interaction))) return;
  await interaction.reply({
    ephemeral: true,
    embeds: [embedMain(interaction.guildId)],
    components: rowsMain(),
  });
}

async function refreshMain(interaction) {
  await interaction.update({
    embeds: [embedMain(interaction.guildId)],
    components: rowsMain(),
  });
}

async function refreshAnti(interaction) {
  await interaction.update({
    embeds: [await embedAntimute(interaction.guild)],
    components: await rowsAntimute(interaction.guild),
  });
}

async function refreshSpammute(interaction) {
  await interaction.update({
    embeds: [await embedSpammute(interaction.guild)],
    components: await rowsSpammute(interaction.guild),
  });
}

async function refreshSpamsg(interaction) {
  await interaction.update({
    embeds: [await embedSpamsg(interaction.guild)],
    components: await rowsSpamsg(interaction.guild),
  });
}

/**
 * @returns {Promise<boolean>} true se foi tratado
 */
export async function handleInteractivePanel(interaction) {
  const id = interaction.customId;
  if (typeof id !== 'string' || !id.startsWith(PANEL_CMP_PREFIX)) {
    return false;
  }

  if (!(await ensureAccess(interaction))) {
    return true;
  }

  const guild = interaction.guild;
  const guildId = interaction.guildId;

  try {
    if (interaction.isButton()) {
      switch (id) {
        case PanelIds.NAV_MAIN:
          await refreshMain(interaction);
          return true;
        case PanelIds.NAV_ANTI:
          await refreshAnti(interaction);
          return true;
        case PanelIds.NAV_SPMUTE:
          await refreshSpammute(interaction);
          return true;
        case PanelIds.NAV_SPAMSG:
          await refreshSpamsg(interaction);
          return true;

        case PanelIds.AU_LIST: {
          const st = getGuildSettings(guildId);
          const ids = st.antiMuteUserIds ?? [];
          await interaction.deferUpdate();
          if (!ids.length) {
            await interaction.followUp({
              content: 'Lista vazia.',
              ephemeral: true,
            });
            return true;
          }
          const lines = await Promise.all(
            ids.map(async (uid) => {
              try {
                const m = await guild.members.fetch(uid);
                return `• ${m.user.tag} — \`${uid}\``;
              } catch {
                return `• \`${uid}\``;
              }
            }),
          );
          await interaction.followUp({
            content: lines.join('\n').slice(0, 2000),
            ephemeral: true,
          });
          return true;
        }

        case PanelIds.AU_CLEAR:
          setGuildSettings(guildId, { antiMuteUserIds: [] });
          await refreshAnti(interaction);
          return true;

        case PanelIds.SPM_ON: {
          const st = getGuildSettings(guildId);
          if (!(st.spamMuteUserIds ?? []).length) {
            await interaction.reply({
              content: 'Adiciona pelo menos **um membro** antes de ligar.',
              ephemeral: true,
            });
            return true;
          }
          setGuildSettings(guildId, { spamMuteEnabled: true });
          const next = getGuildSettings(guildId);
          await enforceSpamMuteAllForGuild(guild, next);
          await refreshSpammute(interaction);
          return true;
        }

        case PanelIds.SPM_OFF:
          setGuildSettings(guildId, { spamMuteEnabled: false });
          await refreshSpammute(interaction);
          return true;

        case PanelIds.SPM_INFO: {
          const st = getGuildSettings(guildId);
          const ids = st.spamMuteUserIds ?? [];
          await interaction.deferUpdate();
          const lines = await Promise.all(
            ids.map(async (uid) => {
              try {
                const m = await guild.members.fetch(uid);
                return `• ${m.user.tag} — \`${uid}\``;
              } catch {
                return `• \`${uid}\``;
              }
            }),
          );
          await interaction.followUp({
            content:
              `**Spam mute** ${st.spamMuteEnabled ? 'ligado' : 'desligado'}\n` +
              (lines.length ? lines.join('\n') : '_sem IDs_'),
            ephemeral: true,
          });
          return true;
        }

        case PanelIds.SG_ON: {
          const st = getGuildSettings(guildId);
          if (!st.spamMsgChannelId) {
            await interaction.reply({
              content: 'Escolhe um **canal** no menu acima primeiro.',
              ephemeral: true,
            });
            return true;
          }
          if (!(st.spamMsgUserIds ?? []).length) {
            await interaction.reply({
              content: 'Adiciona **quem mencionar** no menu.',
              ephemeral: true,
            });
            return true;
          }
          setGuildSettings(guildId, { spamMsgEnabled: true });
          scheduleSpamMsgForGuild(interaction.client, guildId);
          await refreshSpamsg(interaction);
          return true;
        }

        case PanelIds.SG_OFF:
          setGuildSettings(guildId, { spamMsgEnabled: false });
          unscheduleSpamMsgForGuild(guildId);
          await refreshSpamsg(interaction);
          return true;

        case PanelIds.SG_CLEAR:
          setGuildSettings(guildId, {
            spamMsgUserIds: [],
            spamMsgEnabled: false,
          });
          unscheduleSpamMsgForGuild(guildId);
          await refreshSpamsg(interaction);
          return true;

        default:
          return true;
      }
    }

    if (interaction.isUserSelectMenu()) {
      const u = interaction.users.first();
      if (!u) return true;

      if (id === PanelIds.AU_ADD) {
        const st = getGuildSettings(guildId);
        let ids = [...(st.antiMuteUserIds ?? [])];
        if (!ids.includes(u.id)) ids.push(u.id);
        setGuildSettings(guildId, { antiMuteUserIds: ids });
        await refreshAnti(interaction);
        return true;
      }

      if (id === PanelIds.SPM_ADD) {
        const st = getGuildSettings(guildId);
        let ids = [...(st.spamMuteUserIds ?? [])];
        if (!ids.includes(u.id)) ids.push(u.id);
        setGuildSettings(guildId, { spamMuteUserIds: ids });
        const next = getGuildSettings(guildId);
        if (next.spamMuteEnabled) {
          await enforceSpamMuteAllForGuild(guild, next);
        }
        await refreshSpammute(interaction);
        return true;
      }

      if (id === PanelIds.SG_UADD) {
        const st = getGuildSettings(guildId);
        let ids = [...(st.spamMsgUserIds ?? [])];
        if (!ids.includes(u.id)) ids.push(u.id);
        setGuildSettings(guildId, { spamMsgUserIds: ids });
        if (getGuildSettings(guildId).spamMsgEnabled) {
          scheduleSpamMsgForGuild(interaction.client, guildId);
        }
        await refreshSpamsg(interaction);
        return true;
      }

      return true;
    }

    if (interaction.isStringSelectMenu()) {
      const uid = interaction.values[0];

      if (id === PanelIds.AU_RM) {
        const st = getGuildSettings(guildId);
        const ids = (st.antiMuteUserIds ?? []).filter((x) => x !== uid);
        setGuildSettings(guildId, { antiMuteUserIds: ids });
        await refreshAnti(interaction);
        return true;
      }

      if (id === PanelIds.SPM_RM) {
        const st = getGuildSettings(guildId);
        const ids = (st.spamMuteUserIds ?? []).filter((x) => x !== uid);
        const patch = { spamMuteUserIds: ids };
        if (!ids.length) patch.spamMuteEnabled = false;
        setGuildSettings(guildId, patch);
        await refreshSpammute(interaction);
        return true;
      }

      if (id === PanelIds.SG_RM) {
        const st = getGuildSettings(guildId);
        const ids = (st.spamMsgUserIds ?? []).filter((x) => x !== uid);
        const patch = { spamMsgUserIds: ids };
        if (!ids.length) {
          patch.spamMsgEnabled = false;
          unscheduleSpamMsgForGuild(guildId);
        }
        setGuildSettings(guildId, patch);
        if (
          ids.length > 0 &&
          getGuildSettings(guildId).spamMsgEnabled
        ) {
          scheduleSpamMsgForGuild(interaction.client, guildId);
        }
        await refreshSpamsg(interaction);
        return true;
      }

      return true;
    }

    if (interaction.isChannelSelectMenu()) {
      if (id === PanelIds.SG_CH) {
        const ch = interaction.channels.first();
        if (!ch) return true;
        setGuildSettings(guildId, { spamMsgChannelId: ch.id });
        if (getGuildSettings(guildId).spamMsgEnabled) {
          scheduleSpamMsgForGuild(interaction.client, guildId);
        }
        await refreshSpamsg(interaction);
        return true;
      }
    }

    return true;
  } catch (e) {
    console.error(e);
    const msg = 'Erro ao atualizar o painel.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }

  return true;
}
