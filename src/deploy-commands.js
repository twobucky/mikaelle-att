import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as config } from './commands/config.js';
import { data as warn } from './commands/warn.js';
import { data as warnings } from './commands/warnings.js';
import { data as clearwarns } from './commands/clearwarns.js';
import { data as ticket } from './commands/ticket.js';
import { data as lockdown } from './commands/lockdown.js';
import { data as painel } from './commands/panel.js';
import { data as antimute } from './commands/antimute.js';
import { data as spammute } from './commands/spammute.js';
import { data as spammsg } from './commands/spammsg.js';
import { data as sendmsg } from './commands/sendmsg.js';
import { data as manageusers } from './commands/manageusers.js';
import { data as setcargo } from './commands/setcargo.js';

const commands = [
  config.toJSON(),
  warn.toJSON(),
  warnings.toJSON(),
  clearwarns.toJSON(),
  ticket.toJSON(),
  lockdown.toJSON(),
  painel.toJSON(),
  antimute.toJSON(),
  spammute.toJSON(),
  spammsg.toJSON(),
  sendmsg.toJSON(),
  manageusers.toJSON(),
  setcargo.toJSON(),
];

const token = process.env.DISCORD_TOKEN?.trim();
let clientId = process.env.CLIENT_ID?.trim();
const guildId = process.env.GUILD_ID?.trim();

if (!token) {
  console.error(
    'Cria um ficheiro .env na pasta do bot com DISCORD_TOKEN=... (token do Bot no Developer Portal).',
  );
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

/** Obtém o Application ID automaticamente (evita comandos invisíveis por falta de CLIENT_ID). */
async function resolveClientId() {
  if (clientId) return clientId;
  console.log(
    'CLIENT_ID não está no .env — a obter o ID da aplicação pela API (normal).',
  );
  const app = await rest.get('/oauth2/applications/@me');
  if (!app?.id) {
    throw new Error(
      'Não foi possível obter o ID da aplicação. Verifica se o token é de um Bot válido.',
    );
  }
  console.log(`Application ID: ${app.id}`);
  return app.id;
}

try {
  clientId = await resolveClientId();

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(
      `\nOK — ${commands.length} comandos registados neste SERVIDOR (${guildId}).`,
    );
    console.log(
      'Devem aparecer ao escrever / no Discord em poucos segundos (reinicia o Discord se não vires).',
    );
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(
      `\nOK — ${commands.length} comandos registados GLOBALMENTE (isto é sucesso).`,
    );
    console.log(
      '\n*** Sem GUILD_ID no .env, o Discord pode demorar até ~1 hora a mostrar os comandos novos.',
    );
    console.log(
      'Para aparecerem JÁ no teu servidor: abre o .env, mete GUILD_ID=id_do_servidor (botão direito no ícone do servidor → Copiar ID), grava, e corre npm run deploy de novo.',
    );
  }

  console.log(
    '\nConvida o bot com o scope "applications.commands" (OAuth2 → URL Generator no Portal).',
  );
} catch (e) {
  console.error('\nErro ao registar comandos:');
  if (e?.status === 401 || e?.code === 50027) {
    console.error(
      '- Token inválido ou revogado. Developer Portal → Bot → Reset Token.',
    );
  }
  if (e?.status === 403) {
    console.error(
      '- Sem permissão. O token tem de ser do Bot desta aplicação.',
    );
  }
  console.error(e?.rawError ?? e?.message ?? e);
  process.exit(1);
}
