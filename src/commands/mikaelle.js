import { SlashCommandBuilder } from 'discord.js';
import { openRealPanel } from '../lib/realPanel.js';

export const data = new SlashCommandBuilder()
  .setName('mikaelle')
  .setDescription('Abre o painel interativo completo do bot');

export async function execute(interaction) {
  try {
    console.log('[Slash mikaelle] Comando executado por:', interaction.user.tag);
    await openRealPanel(interaction);
    console.log('[Slash mikaelle] Painel aberto com sucesso');
  } catch (error) {
    console.error('[Slash mikaelle] Erro:', error);
    await interaction.reply({
      content: `Erro ao abrir painel: ${error.message}`,
      ephemeral: true,
    });
  }
}
