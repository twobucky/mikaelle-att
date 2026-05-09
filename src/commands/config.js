import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { setGuildSettings, getGuildSettings } from '../lib/storage.js';
import { canManageGuild } from '../lib/logger.js';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configuração do bot neste servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sc) =>
    sc
      .setName('logs')
      .setDescription('Canal onde o bot envia logs de moderação')
      .addChannelOption((o) =>
        o
          .setName('canal')
          .setDescription('Canal de texto')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('tickets')
      .setDescription('Categoria, canal do painel e cargo da staff para tickets')
      .addChannelOption((o) =>
        o
          .setName('categoria')
          .setDescription('Categoria onde novos tickets serão criados')
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true),
      )
      .addChannelOption((o) =>
        o
          .setName('painel')
          .setDescription('Canal onde fica o botão de abrir ticket')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true),
      )
      .addRoleOption((o) =>
        o
          .setName('staff')
          .setDescription('Cargo que pode ver e responder tickets')
          .setRequired(true),
      ),
  )
  .addSubcommand((sc) =>
    sc
      .setName('antiraid')
      .setDescription('Proteção contra entradas em massa')
      .addBooleanOption((o) =>
        o
          .setName('ativo')
          .setDescription('Ligar ou desligar o anti-raid')
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o
          .setName('entradas')
          .setDescription('Quantas entradas na janela disparam alerta (ex: 10)')
          .setMinValue(3)
          .setMaxValue(100),
      )
      .addIntegerOption((o) =>
        o
          .setName('janela_segundos')
          .setDescription('Janela em segundos (ex: 12)')
          .setMinValue(5)
          .setMaxValue(300),
      )
      .addIntegerOption((o) =>
        o
          .setName('idade_minima_conta')
          .setDescription(
            'Dias mínimos da conta; 0 = não aplicar timeout por conta nova',
          )
          .setMinValue(0)
          .setMaxValue(365),
      )
      .addBooleanOption((o) =>
        o
          .setName('lockdown_automatico')
          .setDescription(
            'Ao detectar raid, bloquear envio para @everyone nos canais de texto',
          ),
      ),
  );

export async function execute(interaction) {
  if (!canManageGuild(interaction)) {
    return interaction.reply({
      content:
        'Precisas de ser **dono do servidor**, ou ter **Administrador** / **Gerir servidor**.',
      ephemeral: true,
    });
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'logs') {
    const canal = interaction.options.getChannel('canal', true);
    setGuildSettings(interaction.guildId, { logChannelId: canal.id });

    let aviso = '';
    try {
      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Canal de logs configurado')
            .setDescription(
              'Os registos do bot vão aparecer **aqui**. Podes apagar esta mensagem.',
            )
            .setColor(0x57f287),
        ],
      });
    } catch {
      aviso =
        '\n\n**Atenção:** o bot não conseguiu enviar mensagem nesse canal. Dá ao bot permissão **Ver canal** e **Enviar mensagens** (e **Incorporar links**) em ' +
        canal.toString() +
        '.';
    }

    return interaction.reply({
      content:
        `**Logs ativos** → ${canal}\nVerifica essa sala (mensagem verde de confirmação).` +
        aviso,
      ephemeral: false,
    });
  }

  if (sub === 'tickets') {
    const categoria = interaction.options.getChannel('categoria', true);
    const painel = interaction.options.getChannel('painel', true);
    const staff = interaction.options.getRole('staff', true);
    setGuildSettings(interaction.guildId, {
      ticketCategoryId: categoria.id,
      ticketPanelChannelId: painel.id,
      ticketStaffRoleId: staff.id,
    });
    return interaction.reply({
      content:
        `Tickets configurados.\n` +
        `• Categoria: ${categoria}\n` +
        `• Painel: ${painel}\n` +
        `• Staff: ${staff}\n\n` +
        `Usa \`/ticket painel\` no canal do painel para publicar o botão.`,
      ephemeral: true,
    });
  }

  if (sub === 'antiraid') {
    const ativo = interaction.options.getBoolean('ativo', true);
    const entradas = interaction.options.getInteger('entradas');
    const janela = interaction.options.getInteger('janela_segundos');
    const idade = interaction.options.getInteger('idade_minima_conta');
    const lock = interaction.options.getBoolean('lockdown_automatico');

    const cur = getGuildSettings(interaction.guildId);
    const patch = {
      antiraidEnabled: ativo,
      antiraidJoinThreshold: entradas ?? cur.antiraidJoinThreshold,
      antiraidWindowSeconds: janela ?? cur.antiraidWindowSeconds,
      antiraidMinAccountDays: idade ?? cur.antiraidMinAccountDays,
      antiraidLockdownOnRaid:
        lock !== null && lock !== undefined ? lock : cur.antiraidLockdownOnRaid,
    };
    setGuildSettings(interaction.guildId, patch);

    return interaction.reply({
      content:
        `**Anti-raid** atualizado.\n` +
        `• Ativo: ${patch.antiraidEnabled}\n` +
        `• Limite: ${patch.antiraidJoinThreshold} entradas em ${patch.antiraidWindowSeconds}s\n` +
        `• Idade mínima da conta: ${patch.antiraidMinAccountDays} dias (0 = off)\n` +
        `• Lockdown automático: ${patch.antiraidLockdownOnRaid}`,
      ephemeral: true,
    });
  }
}
