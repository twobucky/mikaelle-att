import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getWarns } from '../lib/storage.js';

export const data = new SlashCommandBuilder()
  .setName('warnings')
  .setDescription('Lista os avisos de um membro')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((o) =>
    o.setName('membro').setDescription('Utilizador').setRequired(true),
  );

export async function execute(interaction) {
  const membro = interaction.options.getUser('membro', true);
  const list = getWarns(interaction.guildId, membro.id);

  if (list.length === 0) {
    return interaction.reply({
      content: `${membro.tag} não tem avisos registados.`,
      ephemeral: true,
    });
  }

  const lines = list.map((w, i) => {
    const date = new Date(w.at).toLocaleString('pt-PT');
    return `**${i + 1}.** ${date} — ${w.reason}\n   Moderador: <@${w.moderatorId}>`;
  });

  const text = lines.join('\n\n').slice(0, 3900);
  return interaction.reply({
    content: `**Avisos de ${membro.tag}** (${list.length})\n\n${text}`,
    ephemeral: true,
  });
}
