import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export const PANEL_MODAL_ID = 'panel_login_modal';
export const FIELD_USER = 'panel_login_user';
export const FIELD_PASSWORD = 'panel_login_password';

/** Modal de login (utilizador + senha) — mesmo formulário para `/mkadm login` e comando sem sessão. */
export function buildLoginModal() {
  const modal = new ModalBuilder()
    .setCustomId(PANEL_MODAL_ID)
    .setTitle('Login do bot');

  const userInput = new TextInputBuilder()
    .setCustomId(FIELD_USER)
    .setLabel('Utilizador (como em PANEL_USER no .env)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(100);

  const passInput = new TextInputBuilder()
    .setCustomId(FIELD_PASSWORD)
    .setLabel('Senha (PANEL_SECRET no .env)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(200);

  return modal.addComponents(
    new ActionRowBuilder().addComponents(userInput),
    new ActionRowBuilder().addComponents(passInput),
  );
}
