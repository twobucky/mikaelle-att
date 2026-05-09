import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} from 'discord.js';
import server from './server.js';
import { getGuildSettings, setGuildSettings, registerTicket } from './lib/storage.js';
import { connectStayVoice } from './lib/voice.js';
import {
  handlePanelModalSubmit,
  hasValidSession,
  panelLoginConfigured,
  isPanelUserAllowed,
} from './lib/panelSession.js';
import { buildLoginModal, PANEL_MODAL_ID } from './lib/panelModal.js';
import {
  bootstrapSpamMsgJobs,
  stopAllSpamMsgJobs,
  unscheduleSpamMsgForGuild,
} from './lib/spamMessageLoop.js';
import { handleInteractivePanel } from './lib/interactivePanel.js';
import { openRealPanel, handleRealPanel } from './lib/realPanel.js';

import { execute as execConfig } from './commands/config.js';
import { execute as execWarn } from './commands/warn.js';
import { execute as execWarnings } from './commands/warnings.js';
import { execute as execClearwarns } from './commands/clearwarns.js';
import { execute as execTicket } from './commands/ticket.js';
import { execute as execLockdown } from './commands/lockdown.js';
import { execute as execPanel } from './commands/panel.js';
import { execute as execAntimute } from './commands/antimute.js';
import { execute as execSpammute } from './commands/spammute.js';
import { execute as execSpammsg } from './commands/spammsg.js';
import { execute as execSendmsg } from './commands/sendmsg.js';
import { execute as execManageusers } from './commands/manageusers.js';
import { execute as execSetcargo } from './commands/setcargo.js';
import { execute as execSecurity } from './commands/security.js';
import { execute as execMikaelle } from './commands/mikaelle.js';

const handlers = {
  config: execConfig,
  warn: execWarn,
  warnings: execWarnings,
  clearwarns: execClearwarns,
  ticket: execTicket,
  lockdown: execLockdown,
  mkadm: execPanel,
  antimute: execAntimute,
  spammute: execSpammute,
  spammsg: execSpammsg,
  sendmsg: execSendmsg,
  manageusers: execManageusers,
  setcargo: execSetcargo,
  security: execSecurity,
  mikaelle: execMikaelle,
};

/** Todos os comandos slash exigem sessão, exceto `/mkadm login`, `/manageusers` e `/security`. Sem sessão → abre modal de login. */
async function requirePanelForCommand(interaction) {
  if (interaction.commandName === 'mkadm') {
    const sub = interaction.options.getSubcommand(false);
    if (sub === 'login') return true;
  }

  // Comandos manageusers e security não exigem sessão (só precisam de Admin)
  if (interaction.commandName === 'manageusers' || interaction.commandName === 'security') {
    return true;
  }

  if (!panelLoginConfigured()) {
    await interaction.reply({
      content:
        'Configura **PANEL_USER** e **PANEL_SECRET** no `.env` do bot e reinicia o processo (`npm start`).',
      ephemeral: true,
    });
    return false;
  }

  if (!hasValidSession(interaction.user.id)) {
    try {
      await interaction.showModal(buildLoginModal());
    } catch {
      await interaction
        .reply({
          content:
            'Não foi possível abrir o login. Usa **`/mkadm login`** ou tenta outra vez.',
          ephemeral: true,
        })
        .catch(() => { });
    }
    return false;
  }

  return true;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ligado como ${c.user.tag}`);

  // Sem monitoramento de saúde para não encher cache do Render
  const raw = process.env.VOICE_CHANNEL_ID;
  const voiceChannelId = raw?.replace(/^\s*["']|["']\s*$/g, '')?.trim();
  if (voiceChannelId) {
    connectStayVoice(c, voiceChannelId);
  }
  bootstrapSpamMsgJobs(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (
      interaction.isModalSubmit() &&
      interaction.customId === PANEL_MODAL_ID
    ) {
      await handlePanelModalSubmit(interaction);
      return;
    }

    if (interaction.isChatInputCommand()) {
      const run = handlers[interaction.commandName];
      if (run) {
        if (!(await requirePanelForCommand(interaction))) return;
        await run(interaction);
      } else {
        await interaction
          .reply({
            content:
              'Este comando não existe nesta versão do bot. Na pasta do bot corre **`npm run deploy`** e reinicia o Discord (ou espera ~1h se usaste comandos globais).',
            ephemeral: true,
          })
          .catch(() => { });
      }
      return;
    }

    if (
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isUserSelectMenu() ||
      interaction.isChannelSelectMenu()
    ) {
      if (interaction.isButton() && interaction.customId === 'ticket_open') {
        await handleTicketOpen(interaction);
        return;
      }
      if (await handleInteractivePanel(interaction)) return;

      // Verificar se é interação do painel real
      if (interaction.isButton() && interaction.customId.startsWith('real_p_')) {
        // Converter para formato de mensagem para compatibilidade
        const mockMessage = {
          author: interaction.user,
          guild: interaction.guild,
          guildId: interaction.guildId,
          client: interaction.client,
          reply: async (options) => {
            if (interaction.deferred || interaction.replied) {
              return await interaction.followUp(options);
            }
            return await interaction.reply(options);
          },
          edit: async (options) => {
            if (interaction.deferred || interaction.replied) {
              return await interaction.editReply(options);
            }
            await interaction.deferUpdate();
            return await interaction.editReply(options);
          }
        };

        if (await handleRealPanel(mockMessage, interaction.customId)) {
          return;
        }
      }
    }
  } catch (err) {
    console.error(err);
    const msg = 'Ocorreu um erro ao processar o pedido.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => { });
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => { });
    }
  }
});

async function handleTicketOpen(interaction) {
  if (!panelLoginConfigured()) {
    return interaction.reply({
      content:
        'Configura **PANEL_USER** e **PANEL_SECRET** no `.env` do bot.',
      ephemeral: true,
    });
  }
  if (!hasValidSession(interaction.user.id)) {
    try {
      await interaction.showModal(buildLoginModal());
    } catch {
      await interaction
        .reply({
          content: 'Usa **`/mkadm login`** ou tenta o botão outra vez.',
          ephemeral: true,
        })
        .catch(() => { });
    }
    return;
  }

  const settings = getGuildSettings(interaction.guildId);
  if (!settings.ticketCategoryId || !settings.ticketStaffRoleId) {
    return interaction.reply({
      content: 'Tickets não estão configurados neste servidor.',
      ephemeral: true,
    });
  }

  const guild = interaction.guild;
  const category = guild.channels.cache.get(settings.ticketCategoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.reply({
      content: 'Categoria de tickets inválida. Reconfigura `/config tickets`.',
      ephemeral: true,
    });
  }

  const existing = guild.channels.cache.find(
    (ch) =>
      ch.parentId === settings.ticketCategoryId &&
      ch.type === ChannelType.GuildText &&
      ch.permissionOverwrites.cache.get(interaction.user.id),
  );
  if (existing) {
    return interaction.reply({
      content: `Já tens um ticket aberto: ${existing}`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const base = `ticket-${interaction.user.username}`
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 20);
  const name = `${base}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const staffRole = guild.roles.cache.get(settings.ticketStaffRoleId);
  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];
  if (staffRole) {
    overwrites.push({
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  let channel;
  try {
    console.log(`[Ticket] Criando canal ${name} na categoria ${settings.ticketCategoryId}`);
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: settings.ticketCategoryId,
      permissionOverwrites: overwrites,
    });
    console.log(`[Ticket] Canal criado com sucesso: ${channel.id}`);
  } catch (e) {
    console.error('[Ticket] Erro ao criar canal:', e);
    return interaction.editReply({
      content:
        `❌ **Erro ao criar ticket:** ${e.message}\n\nVerifique se o bot tem permissão de **Gerir Canais** na categoria.`,
    });
  }

  registerTicket(channel.id, guild.id, interaction.user.id);

  await channel.send({
    content: `${interaction.user} — descreve o teu pedido aqui. Staff: ${staffRole ?? 'configura o cargo'}`,
    embeds: [
      new EmbedBuilder()
        .setTitle('Ticket aberto')
        .setDescription(
          'Quando terminares, usa `/ticket fechar` neste canal (ou um moderador fecha por ti).',
        )
        .setColor(0x57f287),
    ],
  });

  await interaction.editReply({
    content: `Ticket criado: ${channel}`,
  });
}

client.on(Events.MessageCreate, async (message) => {
  // Bloquear DMs para o bot
  if (!message.guild && !message.author.bot) {
    console.log(`[DM Bloqueada] ${message.author.tag} tentou enviar: ${message.content}`);
    try {
      await message.reply({
        content: '🚫 **DMs desativadas**\n\nEste bot não aceita mensagens privadas. Use os comandos slash (`/`) no servidor.',
        ephemeral: false
      });
    } catch (error) {
      console.error('[DM] Erro ao responder DM bloqueada:', error);
    }
    return;
  }

  // Log para depurar todas as mensagens do servidor
  if (message.guild) {
    console.log(`[MessageCreate] ${message.author.tag}: ${message.content}`);
  }

  // Verificar se é comando de prefixo !mikaelle
  if (message.content === '!mikaelle' && !message.author.bot && message.guild) {
    console.log('[Comando] !mikaelle detectado, executando handlePrefixCommand');
    try {
      await handlePrefixCommand(message);
      console.log('[Comando] handlePrefixCommand executado com sucesso');
    } catch (error) {
      console.error('[Comando] Erro em handlePrefixCommand:', error);
    }
  }
});

async function handlePrefixCommand(message) {
  try {
    console.log('Comando !mikaelle recebido de:', message.author.tag);

    if (!message.guild) {
      console.log('Erro: Mensagem não está em um servidor');
      return message.reply({
        content: 'Este comando só pode ser usado em servidores.',
        ephemeral: true,
      });
    }

    console.log('Verificando configuração do painel...');
    // Verificar se o usuário tem permissão (pode usar a mesma lógica do painel)
    if (!panelLoginConfigured()) {
      console.log('Erro: Painel não configurado');
      return message.reply({
        content: 'Painel não configurado. Contate o administrador do bot.',
        ephemeral: true,
      });
    }

    console.log('Verificando permissões do usuário...');
    if (!isPanelUserAllowed(message.author.id)) {
      console.log('Erro: Usuário sem permissão:', message.author.id);
      return message.reply({
        content: 'Você não tem permissão para usar este comando.',
        ephemeral: true,
      });
    }

    console.log('Verificando sessão do usuário...');
    if (!hasValidSession(message.author.id)) {
      console.log('Erro: Sessão inválida para:', message.author.id);
      return message.reply({
        content: '⚠️ **Sessão expirada!** Use `/mkadm login` para fazer login novamente.',
        ephemeral: true,
      });
    }

    console.log('Abrindo painel Real...');
    // Abrir o painel estilo "Painel Real"
    await openRealPanel(message);
    console.log('Painel Real aberto com sucesso');
  } catch (error) {
    console.error('Erro ao executar comando !mikaelle:', error);
    console.error('Stack trace:', error.stack);
    if (!message.replied) {
      await message.reply({
        content: `Ocorreu um erro: ${error.message}`,
        ephemeral: true,
      });
    }
  }
}

client.login(process.env.DISCORD_TOKEN?.trim());
