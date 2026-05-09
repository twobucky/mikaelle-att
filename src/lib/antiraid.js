/** @type {Map<string, number[]>} guildId -> timestamps de entrada */
const joinBuckets = new Map();

function prune(bucket, windowMs) {
  const cutoff = Date.now() - windowMs;
  return bucket.filter((t) => t > cutoff);
}

/**
 * Registra uma entrada e devolve { raid: boolean, count: number } se passar do limite nesta janela.
 */
export function checkJoinRaid(guildId, threshold, windowSeconds) {
  const windowMs = Math.max(1, windowSeconds) * 1000;
  let bucket = joinBuckets.get(guildId) ?? [];
  bucket = prune(bucket, windowMs);
  const beforeCount = bucket.length;
  bucket.push(Date.now());
  joinBuckets.set(guildId, bucket);
  const count = bucket.length;
  /** Dispara só na primeira vez que o limite é atingido nesta janela */
  const raid =
    count >= threshold && beforeCount < threshold;
  return {
    raid,
    count,
    threshold,
    windowSeconds,
  };
}

export function resetGuildJoins(guildId) {
  joinBuckets.delete(guildId);
}
