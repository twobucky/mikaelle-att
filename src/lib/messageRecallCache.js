/** Cache curto de mensagens vistas pelo bot — o Discord não reenvia texto/autor no evento MESSAGE_DELETE se não houver cache. */

const MAX_ENTRIES = 15_000;

const store = new Map();

function trim() {
  while (store.size > MAX_ENTRIES) {
    const k = store.keys().next().value;
    store.delete(k);
  }
}

/**
 * Regista conteúdo + autor (mensagem criada ou atualizada).
 * @param {import('discord.js').Message} message
 */
export function rememberGuildMessage(message) {
  if (!message.guild) return;
  const content =
    typeof message.content === 'string' ? message.content : '';
  store.set(message.id, {
    content,
    authorId: message.author?.id ?? null,
    authorTag: message.author?.tag ?? null,
  });
  trim();
}

/**
 * @param {import('discord.js').Snowflake} messageId
 * @returns {{ content: string, authorId: string|null, authorTag: string|null } | null}
 */
export function takeRecalledMessage(messageId) {
  const v = store.get(messageId);
  if (!v) return null;
  store.delete(messageId);
  return v;
}
