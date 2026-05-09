import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { data as config } from './src/commands/config.js';
import { data as warn } from './src/commands/warn.js';
import { data as warnings } from './src/commands/warnings.js';
import { data as clearwarns } from './src/commands/clearwarns.js';
import { data as ticket } from './src/commands/ticket.js';
import { data as lockdown } from './src/commands/lockdown.js';
import { data as painel } from './src/commands/panel.js';
import { data as antimute } from './src/commands/antimute.js';
import { data as spammute } from './src/commands/spammute.js';
import { data as spammsg } from './src/commands/spammsg.js';
import { data as sendmsg } from './src/commands/sendmsg.js';
import { data as manageusers } from './src/commands/manageusers.js';
import { data as setcargo } from './src/commands/setcargo.js';
import { data as security } from './src/commands/security.js';

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
  security.toJSON(),
];

const token = process.env.DISCORD_TOKEN?.trim();
let clientId = process.env.CLIENT_ID?.trim();
const guildId = process.env.GUILD_ID?.trim();

if (!token) {
  console.error('ERRO: DISCORD_TOKEN não encontrado no .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function resolveClientId() {
  if (clientId) return clientId;
  console.log('CLIENT_ID não encontrado no .env, obtendo automaticamente...');
  const app = await rest.get('/oauth2/applications/@me');
  if (!app?.id) {
    throw new Error('Não foi possível obter o ID da aplicação');
  }
  console.log(`Application ID: ${app.id}`);
  return app.id;
}

try {
  clientId = await resolveClientId();

  console.log(`Registrando ${commands.length} comandos...`);
  console.log('Comandos:', commands.map(c => c.name).join(', '));

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`\n✅ SUCESSO: ${commands.length} comandos registrados no servidor ${guildId}`);
    console.log('Os comandos devem aparecer em poucos segundos no Discord!');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`\n✅ SUCESSO: ${commands.length} comandos registrados globalmente`);
    console.log('⚠️  Comandos globais podem demorar até 1 hora para aparecer');
    console.log('Para aparecerem imediatamente, adicione GUILD_ID ao .env');
  }

} catch (error) {
  console.error('\n❌ ERRO ao registrar comandos:');
  if (error.status === 401) {
    console.error('Token inválido ou revogado');
  } else if (error.status === 403) {
    console.error('Sem permissão - verifique se o token é do bot correto');
  }
  console.error(error.message || error);
  process.exit(1);
}
