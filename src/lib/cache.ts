import { getCloudflareContext } from '@opennextjs/cloudflare';

// TTL in seconds
const GLOBAL_TTL = 60 * 60 * 24; // 24h
const USER_TTL = 60 * 60;        // 1h

// --- Cache keys ---

export const GLOBAL_DECK_KEY = 'decks:global';

export function userDeckKey(userId: number) {
  return `decks:user:${userId}`;
}

// --- KV operations ---

async function getKv() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DECK_CACHE;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const kv = await getKv();
  return kv.get<T>(key, 'json');
}

export async function setCached<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  const kv = await getKv();
  await kv.put(key, JSON.stringify(value), {
    expirationTtl: ttlSeconds,
  });
}

export async function invalidateCache(key: string): Promise<void> {
  const kv = await getKv();
  await kv.delete(key);
}

// --- Convenience ---

export async function setGlobalDeckCache<T>(value: T) {
  return setCached(GLOBAL_DECK_KEY, value, GLOBAL_TTL);
}

export async function setUserDeckCache<T>(userId: number, value: T) {
  return setCached(userDeckKey(userId), value, USER_TTL);
}

export async function invalidateUserDeckCache(userId: number) {
  await invalidateCache(userDeckKey(userId));
}
