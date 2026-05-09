export async function clearUserDMs(client, userId, limit = 100) {
  try {
    const user = await client.users.fetch(userId);
    const dmChannel = await user.createDM().catch(() => null);
    
    if (!dmChannel) {
      return { success: false, message: 'Não foi possível acessar as DMs deste usuário' };
    }
    
    const messages = await dmChannel.messages.fetch({ limit });
    let deletedCount = 0;
    
    for (const message of messages.values()) {
      if (message.author.id === client.user.id) {
        await message.delete().catch(() => {});
        deletedCount++;
      }
    }
    
    return { 
      success: true, 
      message: `Apagadas ${deletedCount} mensagens do bot nas DMs`,
      deletedCount 
    };
  } catch (error) {
    console.error('Erro ao limpar DMs:', error);
    return { success: false, message: 'Erro ao limpar DMs' };
  }
}

export async function clearAllBotDMs(client) {
  try {
    const deletedTotal = 0;
    const processedUsers = [];
    
    // Buscar todos os canais de DM do bot
    client.channels.cache.forEach(channel => {
      if (channel.isDMBased() && channel.type === 1) { // DM channel
        processedUsers.push(channel);
      }
    });
    
    for (const dmChannel of processedUsers) {
      try {
        const messages = await dmChannel.messages.fetch({ limit: 100 });
        let deletedCount = 0;
        
        for (const message of messages.values()) {
          if (message.author.id === client.user.id) {
            await message.delete().catch(() => {});
            deletedCount++;
          }
        }
        
        if (deletedCount > 0) {
          console.log(`Apagadas ${deletedCount} mensagens nas DMs com ${dmChannel.recipient?.tag || 'desconhecido'}`);
        }
      } catch (error) {
        console.error(`Erro ao limpar DMs com ${dmChannel.recipient?.tag || 'desconhecido'}:`, error);
      }
    }
    
    return { 
      success: true, 
      message: `Processadas ${processedUsers.length} DMs. Mensagens do bot apagadas onde possível.` 
    };
  } catch (error) {
    console.error('Erro ao limpar todas as DMs:', error);
    return { success: false, message: 'Erro ao limpar todas as DMs' };
  }
}

export async function closeAllDMs(client) {
  try {
    let closedCount = 0;
    
    // Buscar todos os canais de DM do bot
    client.channels.cache.forEach(channel => {
      if (channel.isDMBased() && channel.type === 1) { // DM channel
        try {
          channel.delete().catch(() => {});
          closedCount++;
        } catch (error) {
          console.error(`Erro ao fechar DM com ${channel.recipient?.tag || 'desconhecido'}:`, error);
        }
      }
    });
    
    return { 
      success: true, 
      message: `Fechadas ${closedCount} DMs com sucesso` 
    };
  } catch (error) {
    console.error('Erro ao fechar todas as DMs:', error);
    return { success: false, message: 'Erro ao fechar todas as DMs' };
  }
}

export async function handleClearDM(interaction) {
  const result = await clearUserDMs(interaction.client, interaction.user.id);
  
  await interaction.reply({
    content: result.success ? `🗑️ ${result.message}` : `❌ ${result.message}`,
    ephemeral: true,
  });
}

export async function handleClearAllDMs(interaction) {
  // Confirmar ação
  await interaction.reply({
    content: '💣 **Iniciando limpeza de todas as DMs...** Isso pode levar um tempo.',
    ephemeral: true,
  });
  
  const result = await clearAllBotDMs(interaction.client);
  
  await interaction.followUp({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    ephemeral: true,
  });
}

export async function handleCloseAllDMs(interaction) {
  // Confirmar ação
  await interaction.reply({
    content: '🔒 **Fechando todas as DMs...**',
    ephemeral: true,
  });
  
  const result = await closeAllDMs(interaction.client);
  
  await interaction.followUp({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    ephemeral: true,
  });
}
