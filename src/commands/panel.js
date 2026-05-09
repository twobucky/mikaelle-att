import { SlashCommandBuilder } from 'discord.js';
import { getGuildSettings, setGuildSettings } from '../lib/storage.js';
import { enforceSpamMuteAllForGuild } from '../lib/spamMute.js';
import {
  scheduleSpamMsgForGuild,
  unscheduleSpamMsgForGuild,
} from '../lib/spamMessageLoop.js';
import {
  hasValidSession,
  clearSession,
  isPanelUserAllowed,
  panelLoginConfigured,
} from '../lib/panelSession.js';
import { buildLoginModal } from '../lib/panelModal.js';
import { openMainPanel } from '../lib/interactivePanel.js';

export const data = new SlashCommandBuilder()
  .setName('mkadm')
  .setDescription('Painel de admin do bot mikaelle (senha no .env — não conflita com Loritta)')
  .addSubcommand((s) =>
    s
      .setName('login')
      .setDescription('Abre o formulário para introduzir a senha do painel'),
  )
  .addSubcommand((s) =>
    s
      .setName('painel')
      .setDescription(
        'Menu com botões (anti-mute, spam mute, spam mensagem) — sem escrever comandos',
      ),
  )
  .addSubcommand((s) =>
    s.setName('logout').setDescription('Termina a sessão do painel neste utilizador'),
  )
  .addSubcommand((s) =>
    s
      .setName('estado')
      .setDescription('Estado do bot (memória, ping, tempo ligado)'),
  )
  .addSubcommand((s) =>
    s
      .setName('servidor')
      .setDescription('Mostra as definições guardadas deste servidor'),
  )
  .addSubcommandGroup((g) =>
    g
      .setName('spam')
      .setDescription('Spam mute — forçar mute/timeout até desligares aqui')
      .addSubcommand((s) =>
        s
          .setName('ligar')
          .setDescription('Ativa e reaplica mute + timeout na lista /spammute'),
      )
      .addSubcommand((s) =>
        s
          .setName('desligar')
          .setDescription('Desativa o spam mute (o bot para de forçar)'),
      )
      .addSubcommand((s) =>
        s
          .setName('estado')
          .setDescription('Mostra se está ligado e os IDs da lista'),
      ),
  )
  .addSubcommandGroup((g) =>
    g
      .setName('spammsg')
      .setDescription('Spam mensagem — menções em loop (canal + IDs em /spammsg)')
      .addSubcommand((s) =>
        s
          .setName('ligar')
          .setDescription('Ativa o loop de menções neste servidor'),
      )
      .addSubcommand((s) =>
        s
          .setName('desligar')
          .setDescription('Para o loop de menções'),
      )
      .addSubcommand((s) =>
        s
          .setName('estado')
          .setDescription('Canal, IDs e se o spam de mensagens está ativo'),
      ),
  );

function deny(interaction, msg) {
  return interaction.reply({ content: msg, ephemeral: true });
}

export async function execute(interaction) {
  const subGroup = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (!panelLoginConfigured()) {
    return deny(
      interaction,
      'Define **PANEL_USER** e **PANEL_SECRET** no `.env` do bot e reinicia.',
    );
  }

  if (!isPanelUserAllowed(interaction.user.id)) {
    return deny(
      interaction,
      'O teu utilizador não está na lista **ADMIN_PANEL_USER_IDS** (opcional no `.env`).',
    );
  }

  if (sub === 'login') {
    return interaction.showModal(buildLoginModal());
  }

  if (sub === 'painel') {
    if (!interaction.guildId) {
      return deny(interaction, 'Usa dentro de um servidor.');
    }
    return openMainPanel(interaction);
  }

  if (!hasValidSession(interaction.user.id)) {
    return deny(
      interaction,
      'Sessão expirada. Usa um comando qualquer para abrir o login ou `/mkadm login`.',
    );
  }

  if (subGroup === 'spam') {
    if (!interaction.guildId) {
      return deny(interaction, 'Usa dentro de um servidor.');
    }
    const st = getGuildSettings(interaction.guildId);
    const ids = st.spamMuteUserIds ?? [];

    if (sub === 'ligar') {
      setGuildSettings(interaction.guildId, { spamMuteEnabled: true });
      const next = getGuildSettings(interaction.guildId);
      await enforceSpamMuteAllForGuild(interaction.guild, next);
      const n = (next.spamMuteUserIds ?? []).length;
      return interaction.reply({
        content:
          `**Spam mute ligado.** ${n ? `Lista: **${n}** ID(s).` : 'Lista vazia — define IDs com `/spammute add`.'}`,
        ephemeral: true,
      });
    }

    if (sub === 'desligar') {
      setGuildSettings(interaction.guildId, { spamMuteEnabled: false });
      return interaction.reply({
        content: '**Spam mute desligado.**',
        ephemeral: true,
      });
    }

    if (sub === 'estado') {
      const on = st.spamMuteEnabled;
      if (ids.length === 0) {
        return interaction.reply({
          content: `**Spam mute:** ${on ? 'ligado' : 'desligado'} — sem IDs.\n/spammute add id`,
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
          `**Spam mute** ${on ? '**LIGADO**' : 'desligado'}\n` +
          lines.join('\n'),
        ephemeral: true,
      });
    }
  }

  if (subGroup === 'spammsg') {
    if (!interaction.guildId) {
      return deny(interaction, 'Usa dentro de um servidor.');
    }
    const st = getGuildSettings(interaction.guildId);
    const msgIds = st.spamMsgUserIds ?? [];

    if (sub === 'ligar') {
      if (!st.spamMsgChannelId) {
        return deny(
          interaction,
          'Define o canal com **`/spammsg canal`** antes.',
        );
      }
      if (!msgIds.length) {
        return deny(
          interaction,
          'Adiciona IDs com **`/spammsg add`**.',
        );
      }
      setGuildSettings(interaction.guildId, { spamMsgEnabled: true });
      scheduleSpamMsgForGuild(interaction.client, interaction.guildId);
      return interaction.reply({
        content: '**Spam mensagem ligado.**',
        ephemeral: true,
      });
    }

    if (sub === 'desligar') {
      setGuildSettings(interaction.guildId, { spamMsgEnabled: false });
      unscheduleSpamMsgForGuild(interaction.guildId);
      return interaction.reply({
        content: '**Spam mensagem desligado.**',
        ephemeral: true,
      });
    }

    if (sub === 'estado') {
      const ch = st.spamMsgChannelId
        ? await interaction.guild.channels
            .fetch(st.spamMsgChannelId)
            .catch(() => null)
        : null;
      const chLabel = ch ? `${ch}` : '`sem canal`';
      const on = st.spamMsgEnabled;
      if (!msgIds.length) {
        return interaction.reply({
          content:
            `**Spam mensagem:** ${on ? 'ligado' : 'desligado'} — sem IDs.\n` +
            `Canal: ${chLabel}\n/spammsg add`,
          ephemeral: true,
        });
      }
      const lines = await Promise.all(
        msgIds.map(async (id) => {
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
          `**Spam mensagem** ${on ? '**ATIVO**' : 'desligado'}\n` +
          `Canal: ${chLabel}\n` +
          lines.join('\n'),
        ephemeral: true,
      });
    }
  }

  if (sub === 'logout') {
    clearSession(interaction.user.id);
    return interaction.reply({
      content: 'Sessão do painel terminada.',
      ephemeral: true,
    });
  }

  if (sub === 'estado') {
    const c = interaction.client;
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    return interaction.reply({
      content:
        `**Bot:** ${c.user.tag}\n` +
        `**Servidores:** ${c.guilds.cache.size}\n` +
        `**Ping WebSocket:** ${c.ws.ping} ms\n` +
        `**Uptime:** ${h}h ${m}m ${s}s\n` +
        `**RAM (heap):** ~${mem} MB`,
      ephemeral: true,
    });
  }

  if (sub === 'servidor') {
    if (!interaction.guildId) {
      return deny(interaction, 'Usa este comando dentro de um servidor.');
    }
    const st = getGuildSettings(interaction.guildId);
    const json = JSON.stringify(st, null, 2).slice(0, 3900);
    return interaction.reply({
      content: `Definições guardadas (JSON):\n\`\`\`json\n${json}\n\`\`\``,
      ephemeral: true,
    });
  }
}
