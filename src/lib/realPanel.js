import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} from 'discord.js';
import { getGuildSettings, setGuildSettings } from './storage.js';
import { hasValidSession, isPanelUserAllowed, panelLoginConfigured } from './panelSession.js';
import { buildLoginModal } from './panelModal.js';
import { enforceSpamMuteAllForGuild } from './spamMute.js';
import {
  scheduleSpamMsgForGuild,
  unscheduleSpamMsgForGuild,
} from './spamMessageLoop.js';
import { handleFarmCallOn, handleFarmCallOff } from './farmCall.js';
import { handleClearDM, handleClearAllDMs, handleCloseAllDMs } from './dmManager.js';
import { removeSpamMuteAllFromGuild } from './spamMute.js';

export const REAL_PANEL_PREFIX = 'real_p_';

export const RealPanelIds = {
  // Navegação
  NAV_MAIN: 'real_p_nav_main',
  NAV_SPAM: 'real_p_nav_spam',
  NAV_MOD: 'real_p_nav_mod',
  NAV_DM: 'real_p_nav_dm',
  NAV_VOICE: 'real_p_nav_voice',

  // Spam Mute
  SPAM_MUTE_ON: 'real_p_spam_mute_on',
  SPAM_MUTE_OFF: 'real_p_spam_mute_off',
  SPAM_MUTE_ADD_USER: 'real_p_spam_mute_add_user',
  SPAM_MUTE_ADD_ID: 'real_p_spam_mute_add_id',
  SPAM_MUTE_LIST: 'real_p_spam_mute_list',
  SPAM_MUTE_CLEAR: 'real_p_spam_mute_clear',

  // Spam Mensagem
  SPAM_MSG_ON: 'real_p_spam_msg_on',
  SPAM_MSG_OFF: 'real_p_spam_msg_off',
  SPAM_MSG_SET_CHANNEL: 'real_p_spam_msg_set_channel',
  SPAM_MSG_ADD_USER: 'real_p_spam_msg_add_user',
  SPAM_MSG_ADD_ID: 'real_p_spam_msg_add_id',
  SPAM_MSG_LIST: 'real_p_spam_msg_list',
  SPAM_MSG_CLEAR: 'real_p_spam_msg_clear',

  // Anti-Mute
  ANTI_MUTE_ADD_USER: 'real_p_anti_mute_add_user',
  ANTI_MUTE_LIST: 'real_p_anti_mute_list',
  ANTI_MUTE_CLEAR: 'real_p_anti_mute_clear',

  // DM Management
  CLEAR_DM: 'real_p_clear_dm',
  CLEAR_ALL_DMS: 'real_p_clear_all_dms',
  CLOSE_ALL_DMS: 'real_p_close_all_dms',

  // Voice/Call Management
  FARM_CALL_ON: 'real_p_farm_on',
  FARM_CALL_OFF: 'real_p_farm_off',
  JOIN_VOICE: 'real_p_join_voice',
  LEAVE_VOICE: 'real_p_leave_voice',

  // Moderação
  WARN_USER: 'real_p_warn_user',
  CLEAR_WARNS: 'real_p_clear_warns',
  LOCKDOWN_ON: 'real_p_lockdown_on',
  LOCKDOWN_OFF: 'real_p_lockdown_off',
};

function deny(message, text) {
  return message.reply({ content: text, ephemeral: true });
}

async function ensureAccess(message) {
  if (!panelLoginConfigured()) {
    await deny(message, 'Define **PANEL_USER** e **PANEL_SECRET** no `.env`.');
    return false;
  }
  if (!isPanelUserAllowed(message.author.id)) {
    await deny(message, 'Você não está em **ADMIN_PANEL_USER_IDS**.');
    return false;
  }
  if (!message.guild) {
    await deny(message, 'Usa isto dentro de um servidor.');
    return false;
  }
  if (!hasValidSession(message.author.id)) {
    try {
      // Para mensagens de prefixo, não podemos mostrar modal, então respondemos com instruções
      await deny(message, 'Sessão expirada. Use `/mkadm login` para fazer login novamente.');
    } catch {
      await deny(message, 'Sessão expirada. Use `/mkadm login` para fazer login novamente.');
    }
    return false;
  }
  return true;
}

function embedMain() {
  return new EmbedBuilder()
    .setTitle('⚡ Painel de Controle ⚡')
    .setDescription('Gerencie as funções essenciais do bot de forma rápida e organizada!')
    .setColor(0x5865f2)
    .setThumbnail('https://cdn.discordapp.com/attachments/8413999704937394206/8413999704937394206.png')
    .addFields(
      { name: '🚀 **Spam Mute**', value: 'Mute em call (sem timeout)', inline: true },
      { name: '💬 **Spam Mensagem**', value: 'Menções em loop (1.5s)', inline: true },
      { name: '🛡️ **Anti-Mute**', value: 'Desmuta usuários protegidos', inline: true }
    )
    .setFooter({ text: 'Painel Administrativo v2.0 • Sistema Reformulado' });
}

function rowsMain() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_SPAM)
        .setLabel('🚀 Spam Mute')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MUTE_ON)
        .setLabel('🔇 Mute ON')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MUTE_OFF)
        .setLabel('� Mute OFF')
        .setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MSG_ON)
        .setLabel('💬 Spam Msg ON')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MSG_OFF)
        .setLabel('💬 Spam Msg OFF')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_MAIN)
        .setLabel('🔄 Atualizar')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function embedSpam(guild) {
  const st = getGuildSettings(guild.id);
  const spamMuteOn = st.spamMuteEnabled;
  const spamMsgOn = st.spamMsgEnabled;
  const spamMuteCount = (st.spamMuteUserIds ?? []).length;
  const spamMsgCount = (st.spamMsgUserIds ?? []).length;

  return new EmbedBuilder()
    .setTitle('🚀 Funções de Spam')
    .setDescription('Controle completo de sistemas de spam e mute automático')
    .setColor(0xff0000)
    .setThumbnail('https://cdn.discordapp.com/attachments/8413999704937394206/8413999704937394206.png')
    .addFields(
      {
        name: '🔇 Spam Mute',
        value: `${spamMuteOn ? '✅ **ATIVO**' : '❌ **Inativo'}\n${spamMuteCount} usuário(s) na lista\nMute + timeout automático`,
        inline: true
      },
      {
        name: '💬 Spam Mensagem',
        value: `${spamMsgOn ? '✅ **ATIVO**' : '❌ **Inativo'}\n${spamMsgCount} ID(s) para mencionar\nIntervalo: 1.5s`,
        inline: true
      },
      { name: '🛡️ Anti-Mute', value: `${(st.antiMuteUserIds ?? []).length} usuário(s) protegidos\nRemove mute/timeout`, inline: true }
    )
    .setFooter({ text: 'Painel Administrativo v2.0 • Controle total' });
}

function rowsSpam(guild) {
  const st = getGuildSettings(guild.id);
  const spamMuteOn = st.spamMuteEnabled;
  const spamMsgOn = st.spamMsgEnabled;

  return [
    // Spam Mute Controls
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MUTE_ON)
        .setLabel('🔇 Spam Mute ON')
        .setStyle(spamMuteOn ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MUTE_OFF)
        .setLabel('🔇 Spam Mute OFF')
        .setStyle(spamMuteOn ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MUTE_ADD_USER)
        .setLabel('➕ Add Usuário')
        .setStyle(ButtonStyle.Primary),
    ),
    // Spam Mensagem Controls
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MSG_ON)
        .setLabel('💬 Spam Msg ON')
        .setStyle(spamMsgOn ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MSG_OFF)
        .setLabel('💬 Spam Msg OFF')
        .setStyle(spamMsgOn ? ButtonStyle.Secondary : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MSG_SET_CHANNEL)
        .setLabel('📢 Set Canal')
        .setStyle(ButtonStyle.Primary),
    ),
    // Management and Navigation
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MUTE_LIST)
        .setLabel('📋 Lista Mute')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.SPAM_MSG_LIST)
        .setLabel('📋 Lista Msg')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_MAIN)
        .setLabel('← Voltar')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function embedDM() {
  return new EmbedBuilder()
    .setTitle('💬 DM Management')
    .setDescription('Gerenciamento completo de mensagens diretas do bot')
    .setColor(0x00bfff)
    .setThumbnail('https://cdn.discordapp.com/attachments/8413999704937394206/8413999704937394206.png')
    .addFields(
      { name: '🗑️ **Limpar DMs**', value: 'Apaga mensagens do bot nas suas DMs', inline: true },
      { name: '💣 **Limpar Todas**', value: 'Apaga mensagens em TODAS as DMs', inline: true },
      { name: '🔒 **Fechar Todas**', value: 'Fecha TODOS os canais de DM', inline: true }
    )
    .addFields(
      { name: '⚡ **Ações Imediatas**', value: 'Processamento rápido e seguro', inline: false }
    )
    .setFooter({ text: '⚠️ Ações irreversíveis - use com responsabilidade' });
}

function embedVoice() {
  return new EmbedBuilder()
    .setTitle('🎤 Voice & Call Management')
    .setDescription('Controle de canais de voz e farm call')
    .setColor(0x00ff00)
    .addFields(
      { name: '🚀 Farm Call ON', value: 'Entra e fica no seu canal de voz', inline: true },
      { name: '🔇 Farm Call OFF', value: 'Sai do canal de voz atual', inline: true },
      { name: '🎤 Join Voice', value: 'Entra em um canal específico', inline: true },
      { name: '👋 Leave Voice', value: 'Sai de qualquer canal de voz', inline: true }
    )
    .setFooter({ text: 'Você precisa estar em um canal para Farm Call' });
}

function embedMod() {
  return new EmbedBuilder()
    .setTitle('⚡ Moderação')
    .setDescription('Ferramentas de moderação do servidor')
    .setColor(0xff9900)
    .addFields(
      { name: '⚠️ Warn User', value: 'Aplica advertência em usuário', inline: true },
      { name: '�️ Clear Warns', value: 'Remove todas as advertências', inline: true },
      { name: '🔒 Lockdown ON', value: 'Ativa lockdown do servidor', inline: true },
      { name: '� Lockdown OFF', value: 'Desativa lockdown do servidor', inline: true }
    )
    .setFooter({ text: 'Requer permissões de moderador' });
}

function rowsDM() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.CLEAR_DM)
        .setLabel('🗑️ Limpar DMs')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.CLEAR_ALL_DMS)
        .setLabel('💣 Limpar Todas')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.CLOSE_ALL_DMS)
        .setLabel('🔒 Fechar Todas')
        .setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_MAIN)
        .setLabel('← Menu Principal')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_SPAM)
        .setLabel('🚀 Spam')
        .setStyle(ButtonStyle.Success),
    ),
  ];
}

function rowsVoice() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.FARM_CALL_ON)
        .setLabel('🚀 Farm Call ON')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.FARM_CALL_OFF)
        .setLabel('🔇 Farm Call OFF')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.JOIN_VOICE)
        .setLabel('🎤 Join Voice')
        .setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.LEAVE_VOICE)
        .setLabel('� Leave Voice')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_MAIN)
        .setLabel('← Voltar')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function rowsMod() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.WARN_USER)
        .setLabel('⚠️ Warn User')
        .setStyle(ButtonStyle.Warning),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.CLEAR_WARNS)
        .setLabel('�️ Clear Warns')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.LOCKDOWN_ON)
        .setLabel('🔒 Lockdown ON')
        .setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(RealPanelIds.LOCKDOWN_OFF)
        .setLabel('🔓 Lockdown OFF')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(RealPanelIds.NAV_MAIN)
        .setLabel('← Voltar')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export async function openRealPanel(message) {
  if (!(await ensureAccess(message))) return;

  await message.reply({
    ephemeral: true,
    embeds: [embedMain()],
    components: rowsMain(),
  });
}

async function refreshMain(message) {
  await message.edit({
    embeds: [embedMain()],
    components: rowsMain(),
  });
}

async function refreshSpam(message) {
  await message.edit({
    embeds: [embedSpam(message.guild)],
    components: rowsSpam(message.guild),
  });
}

async function refreshDM(message) {
  await message.edit({
    embeds: [embedDM()],
    components: rowsDM(),
  });
}

async function refreshVoice(message) {
  await message.edit({
    embeds: [embedVoice()],
    components: rowsVoice(),
  });
}

async function refreshMod(message) {
  await message.edit({
    embeds: [embedMod()],
    components: rowsMod(),
  });
}

export async function handleRealPanel(message, customId) {
  if (!customId.startsWith(REAL_PANEL_PREFIX)) {
    return false;
  }

  if (!(await ensureAccess(message))) {
    return true;
  }

  const guild = message.guild;
  const guildId = guild.id;

  try {
    switch (customId) {
      case RealPanelIds.NAV_MAIN:
        await refreshMain(message);
        return true;

      case RealPanelIds.FARM_CALL_ON:
        await handleFarmCallOn(message);
        await refreshVoice(message);
        return true;

      case RealPanelIds.FARM_CALL_OFF:
        await handleFarmCallOff(message);
        await refreshVoice(message);
        return true;

      case RealPanelIds.JOIN_VOICE:
        await message.reply({
          content: '🎤 **Função em desenvolvimento** - Use Farm Call ON para entrar no seu canal',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.LEAVE_VOICE:
        await handleFarmCallOff(message);
        await refreshVoice(message);
        return true;

      case RealPanelIds.CLEAR_DM:
        await handleClearDM(message);
        await refreshDM(message);
        return true;

      case RealPanelIds.CLEAR_ALL_DMS:
        await handleClearAllDMs(message);
        await refreshDM(message);
        return true;

      case RealPanelIds.CLOSE_ALL_DMS:
        await handleCloseAllDMs(message);
        await refreshDM(message);
        return true;

      case RealPanelIds.SPAM_MUTE_ON:
        setGuildSettings(guildId, { spamMuteEnabled: true });
        const settings = getGuildSettings(guildId);
        await enforceSpamMuteAllForGuild(guild, settings);
        await message.reply({
          content: '🔇 **Spam Mute ativado**',
          ephemeral: true,
        });
        await refreshMain(message);
        return true;

      case RealPanelIds.SPAM_MUTE_OFF:
        setGuildSettings(guildId, { spamMuteEnabled: false });
        const muteSettings = getGuildSettings(guildId);
        await removeSpamMuteAllFromGuild(guild, muteSettings);
        await message.reply({
          content: '🔇 **Spam Mute desativado** - Mutes removidos',
          ephemeral: true,
        });
        await refreshMain(message);
        return true;

      case RealPanelIds.SPAM_MUTE_ADD_USER:
        await message.reply({
          content: '👤 **Use `/spammute adduser`** para adicionar um usuário ao Spam Mute',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.SPAM_MUTE_LIST:
        const muteSt = getGuildSettings(guildId);
        const muteIds = muteSt.spamMuteUserIds ?? [];
        if (muteIds.length === 0) {
          await message.reply({
            content: '📋 **Lista de Spam Mute vazia**',
            ephemeral: true,
          });
        } else {
          const lines = await Promise.all(
            muteIds.map(async (id) => {
              try {
                const m = await guild.members.fetch(id);
                return `• ${m.user.tag} — \`${id}\``;
              } catch {
                return `• (fora do servidor) — \`${id}\``;
              }
            }),
          );
          await message.reply({
            content: `📋 **Spam Mute - Lista:**\n${lines.join('\n')}`,
            ephemeral: true,
          });
        }
        return true;

      case RealPanelIds.SPAM_MUTE_CLEAR:
        setGuildSettings(guildId, { spamMuteUserIds: [] });
        await message.reply({
          content: '🗑️ **Lista de Spam Mute limpa**',
          ephemeral: true,
        });
        await refreshSpam(message);
        return true;

      case RealPanelIds.SPAM_MSG_ON:
        const msgSt = getGuildSettings(guildId);
        if (!msgSt.spamMsgChannelId) {
          await message.reply({
            content: 'Configure um canal primeiro com `/spammsg canal`',
            ephemeral: true,
          });
          return true;
        }
        if (!(msgSt.spamMsgUserIds?.length)) {
          await message.reply({
            content: 'Adicione IDs primeiro com `/spammsg add`',
            ephemeral: true,
          });
          return true;
        }
        setGuildSettings(guildId, { spamMsgEnabled: true });
        scheduleSpamMsgForGuild(message.client, guildId);
        await message.reply({
          content: '💬 **Spam Mensagem ativado**',
          ephemeral: true,
        });
        await refreshMain(message);
        return true;

      case RealPanelIds.SPAM_MSG_OFF:
        setGuildSettings(guildId, { spamMsgEnabled: false });
        unscheduleSpamMsgForGuild(guildId);
        await message.reply({
          content: '💬 **Spam Mensagem desativado**',
          ephemeral: true,
        });
        await refreshMain(message);
        return true;

      case RealPanelIds.SPAM_MSG_SET_CHANNEL:
        await message.reply({
          content: '📢 **Use `/spammsg canal`** para definir o canal de spam',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.SPAM_MSG_ADD_USER:
        await message.reply({
          content: '👤 **Use `/spammsg adduser`** para adicionar um usuário ao Spam Mensagem',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.SPAM_MSG_LIST:
        const spamSt = getGuildSettings(guildId);
        const spamIds = spamSt.spamMsgUserIds ?? [];
        if (spamIds.length === 0) {
          await message.reply({
            content: '📋 **Lista de Spam Mensagem vazia**',
            ephemeral: true,
          });
        } else {
          const lines = await Promise.all(
            spamIds.map(async (id) => {
              try {
                const m = await guild.members.fetch(id);
                return `• ${m.user.tag} — \`${id}\``;
              } catch {
                return `• (fora do servidor) — \`${id}\``;
              }
            }),
          );
          await message.reply({
            content: `📋 **Spam Mensagem - Lista:**\n${lines.join('\n')}`,
            ephemeral: true,
          });
        }
        return true;

      case RealPanelIds.SPAM_MSG_CLEAR:
        setGuildSettings(guildId, {
          spamMsgUserIds: [],
          spamMsgEnabled: false
        });
        unscheduleSpamMsgForGuild(guildId);
        await message.reply({
          content: '🗑️ **Lista de Spam Mensagem limpa**',
          ephemeral: true,
        });
        await refreshSpam(message);
        return true;

      case RealPanelIds.WARN_USER:
        await message.reply({
          content: '⚠️ **Use `/warn`** para aplicar advertência em um usuário',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.CLEAR_WARNS:
        await message.reply({
          content: '🗑️ **Use `/clearwarns`** para remover advertências de um usuário',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.LOCKDOWN_ON:
        await message.reply({
          content: '🔒 **Use `/lockdown ativo:true`** para ativar lockdown do servidor',
          ephemeral: true,
        });
        return true;

      case RealPanelIds.LOCKDOWN_OFF:
        await message.reply({
          content: '🔓 **Use `/lockdown ativo:false`** para desativar lockdown do servidor',
          ephemeral: true,
        });
        return true;

      default:
        return true;
    }
  } catch (e) {
    console.error(e);
    await message.reply({
      content: 'Erro ao processar ação do painel.',
      ephemeral: true,
    });
  }

  return true;
}
