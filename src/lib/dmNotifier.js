import { EmbedBuilder } from 'discord.js';

/**
 * Envia uma notificação DM para o usuário que ativou uma função
 * @param {import('discord.js').User} user - Usuário para receber a DM
 * @param {string} functionName - Nome da função ativada
 * @param {string} status - Status da função (ativado/desativado)
 * @param {string} details - Detalhes adicionais sobre a ativação
 * @param {import('discord.js').Guild} guild - Servidor onde ocorreu
 */
export async function sendFunctionNotification(user, functionName, status, details, guild) {
  try {
    const color = status === 'ativado' || status === 'ligado' ? 0x57f287 : 0xed4245;
    const emoji = status === 'ativado' || status === 'ligado' ? '✅' : '❌';
    
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Função ${status.toUpperCase()}`)
      .setColor(color)
      .addFields(
        { name: '🔧 Função', value: `\`${functionName}\``, inline: true },
        { name: '📊 Status', value: status, inline: true },
        { name: '🌐 Servidor', value: guild.name, inline: false }
      )
      .setTimestamp()
      .setFooter({ 
        text: `ID: ${guild.id} | Por: ${user.tag}`,
        iconURL: user.displayAvatarURL({ dynamic: true })
      });

    if (details) {
      embed.addFields({ name: '📝 Detalhes', value: details, inline: false });
    }

    await user.send({ embeds: [embed] });
    console.log(`[DMNotifier] Notificação enviada para ${user.tag}: ${functionName} ${status}`);
    return true;
  } catch (error) {
    console.error(`[DMNotifier] Erro ao enviar DM para ${user.tag}:`, error);
    return false;
  }
}

/**
 * Envia notificação de múltiplas funções ativadas
 * @param {import('discord.js').User} user - Usuário para receber a DM
 * @param {Array} functions - Array de objetos { name, status, details }
 * @param {import('discord.js').Guild} guild - Servidor onde ocorreu
 */
export async function sendMultipleFunctionsNotification(user, functions, guild) {
  try {
    const embed = new EmbedBuilder()
      .setTitle('🔔 Resumo de Funções Modificadas')
      .setColor(0x5865F2)
      .addFields(
        { name: '🌐 Servidor', value: guild.name, inline: false }
      )
      .setTimestamp()
      .setFooter({ 
        text: `ID: ${guild.id} | Por: ${user.tag}`,
        iconURL: user.displayAvatarURL({ dynamic: true })
      });

    functions.forEach(func => {
      const emoji = func.status === 'ativado' || func.status === 'ligado' ? '✅' : '❌';
      const value = func.details || 'Nenhum detalhe adicional';
      embed.addFields({ 
        name: `${emoji} ${func.name}`, 
        value: `**Status:** ${func.status}\n**Detalhes:** ${value}`,
        inline: false 
      });
    });

    await user.send({ embeds: [embed] });
    console.log(`[DMNotifier] Notificação múltipla enviada para ${user.tag}: ${functions.length} funções`);
    return true;
  } catch (error) {
    console.error(`[DMNotifier] Erro ao enviar DM múltipla para ${user.tag}:`, error);
    return false;
  }
}
