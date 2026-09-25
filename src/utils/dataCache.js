/**
 * In-memory runtime cache for component transitions (No browser storage / sessionStorage)
 */

const memoryCache = new Map();
const TTL_MS = 30 * 1000; // 30 seconds runtime TTL

export function getCachedData(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  const isFresh = Date.now() - item.timestamp < TTL_MS;
  return {
    data: item.data,
    isFresh
  };
}

export function setCachedData(key, data) {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function getSessionCachedData(key) {
  const item = memoryCache.get(key);
  return item ? item.data : null;
}

export function invalidateCache(keyPattern) {
  if (!keyPattern) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.includes(keyPattern)) {
      memoryCache.delete(k);
    }
  }
}
