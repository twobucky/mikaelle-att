import { setGuildSettings, getGuildSettings } from './storage.js';

const farmCallStates = new Map(); // guildId -> { channelId, intervalId }

export async function startFarmCall(client, guildId, channelId) {
  // Parar farm call existente se houver
  stopFarmCall(guildId);
  
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;
  
  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isVoiceBased()) return false;
  
  try {
    // Obter ou criar um bot member se necessário
    const botMember = await guild.members.fetch(client.user.id);
    
    // Entrar no canal
    await channel.join();
    
    // Salvar estado
    setGuildSettings(guildId, { farmCallChannelId: channelId, farmCallActive: true });
    farmCallStates.set(guildId, { channelId, intervalId: null });
    
    return true;
  } catch (error) {
    console.error('Erro ao entrar no canal de voz:', error);
    return false;
  }
}

export function stopFarmCall(guildId) {
  const state = farmCallStates.get(guildId);
  if (state && state.intervalId) {
    clearInterval(state.intervalId);
  }
  farmCallStates.delete(guildId);
  
  // Atualizar configurações
  setGuildSettings(guildId, { farmCallActive: false });
  
  // Sair do canal (isso é feito automaticamente pelo Discord.js quando o bot é desconectado)
  return true;
}

export function getFarmCallState(guildId) {
  return farmCallStates.get(guildId) || null;
}

export async function handleFarmCallOn(interaction) {
  const guild = interaction.guild;
  const guildId = guild.id;
  
  // Verificar se já está ativo
  const currentState = getFarmCallState(guildId);
  if (currentState) {
    await interaction.reply({
      content: '🎤 **Farm Call já está ativo**',
      ephemeral: true,
    });
    return;
  }
  
  // Tentar entrar no canal de voz do usuário
  const member = guild.members.cache.get(interaction.user.id);
  if (!member || !member.voice.channelId) {
    await interaction.reply({
      content: '❌ Você precisa estar em um canal de voz para ativar o Farm Call',
      ephemeral: true,
    });
    return;
  }
  
  const success = await startFarmCall(interaction.client, guildId, member.voice.channelId);
  
  if (success) {
    await interaction.reply({
      content: `🎤 **Farm Call ativado** - Entrando no canal ${member.voice.channel}`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: '❌ Não foi possível entrar no canal de voz. Verifique as permissões do bot.',
      ephemeral: true,
    });
  }
}

export async function handleFarmCallOff(interaction) {
  const guildId = interaction.guild.id;
  
  const currentState = getFarmCallState(guildId);
  if (!currentState) {
    await interaction.reply({
      content: '🔇 **Farm Call não está ativo**',
      ephemeral: true,
    });
    return;
  }
  
  stopFarmCall(guildId);
  
  // Sair do canal de voz
  const guild = interaction.guild;
  const voiceConnection = guild.voice;
  if (voiceConnection) {
    voiceConnection.disconnect();
  }
  
  await interaction.reply({
    content: '🔇 **Farm Call desativado** - Saindo do canal de voz',
    ephemeral: true,
  });
}
