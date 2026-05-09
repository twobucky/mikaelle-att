import { AuditLogEvent } from 'discord.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Procura uma entrada recente do audit log cujo alvo é o utilizador indicado.
 * O bot precisa da permissão **Ver registo de auditoria** no servidor.
 */
export async function fetchModeratorFor(
  guild,
  auditEventType,
  targetUserId,
  { maxAgeMs = 12000, limit = 20 } = {},
) {
  try {
    const logs = await guild.fetchAuditLogs({
      type: auditEventType,
      limit,
    });
    const cutoff = Date.now() - maxAgeMs;
    for (const [, entry] of logs.entries) {
      if (entry.createdTimestamp < cutoff) continue;
      const tid =
        entry.targetId ?? entry.target?.id ?? entry.target?.user?.id;
      if (tid === targetUserId) {
        return {
          executor: entry.executor,
          reason: entry.reason,
        };
      }
    }
  } catch {
    /* sem permissão Ver registo de auditoria */
  }
  return null;
}

/**
 * Entrada MESSAGE_DELETE no audit: alvo = autor da mensagem; executor = quem apagou (mod) ou pode coincidir com o autor.
 * Sem `authorId`, usa a entrada mais recente no canal (útil quando o evento vem parcial).
 */
export async function fetchMessageDeleteAudit(
  guild,
  { channelId, authorId = null, maxAgeMs = 12000, limit = 20 } = {},
) {
  try {
    /* Audit pode aparecer alguns ms depois da gateway — sem isto falha por tempo */
    await sleep(1100);
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit,
    });
    const cutoff = Date.now() - maxAgeMs;
    const wantCh = String(channelId);

    for (const [, entry] of logs.entries) {
      if (entry.createdTimestamp < cutoff) continue;
      const extraCh = entry.extra?.channel;
      const entryCh =
        extraCh?.id != null ? String(extraCh.id) : null;
      if (!entryCh || entryCh !== wantCh) continue;

      const targetId =
        entry.targetId ?? entry.target?.id ?? entry.target?.user?.id ?? null;
      if (
        authorId &&
        targetId &&
        String(targetId) !== String(authorId)
      ) {
        continue;
      }

      return {
        executor: entry.executor,
        reason: entry.reason,
        authorUserId: targetId,
        authorTag: entry.target?.tag ?? null,
      };
    }
  } catch {
    /* sem permissão Ver registo de auditoria */
  }
  return null;
}

export function formatModeratorLine(executor, fallback = 'Não detetado (saiu sozinho / sem permissão de audit no bot)') {
  if (!executor) return `**Moderador:** ${fallback}`;
  return `**Moderador:** ${executor.tag} (\`${executor.id}\`)`;
}

/**
 * Rodapé com IDs em formato copiável — usar em todos os logs com alvo (e moderador opcional).
 * @param {string} subjectId — ID do alvo (utilizador removido, canal, etc.)
 * @param {string|null|undefined} moderatorId — ID de quem executou a ação (kick, disconnect, ban…)
 * @param {string} subjectLabel — texto da primeira linha de ID (ex.: "ID alvo", "ID canal")
 */
export function formatIdsFooter(
  subjectId,
  moderatorId = null,
  subjectLabel = 'ID alvo / removido',
) {
  const mod =
    moderatorId != null && String(moderatorId).length > 0
      ? `\`${moderatorId}\``
      : '`—`';
  return (
    `\n────────\n**${subjectLabel}:** \`${subjectId}\`\n**ID moderador (quem tirou / aplicou):** ${mod}`
  );
}

export { AuditLogEvent };
