import { SlashCommandBuilder } from 'discord.js';
import { openRealPanel } from '../lib/realPanel.js';

export const data = new SlashCommandBuilder()
  .setName('mikaelle')
  .setDescription('Abre o painel interativo completo do bot');

export async function execute(interaction) {
  try {
    await openRealPanel(interaction);
  } catch (error) {
    await interaction.reply({
      content: `Erro ao abrir painel: ${error.message}`,
      ephemeral: true,
    });
  }
}
