/**
 * Smart Memory & Session Cache for fast instantaneous UI renders
 * Solves multi-second delays when switching pages or fetching collections.
 */

const memoryCache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds fresh TTL

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
  // Also keep a lightweight copy in sessionStorage for instant load on tab re-entry
  try {
    sessionStorage.setItem(`univo_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore storage quota limits
  }
}

export function getSessionCachedData(key) {
  try {
    const raw = sessionStorage.getItem(`univo_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data) {
        // Hydrate in-memory
        if (!memoryCache.has(key)) {
          memoryCache.set(key, parsed);
        }
        return parsed.data;
      }
    }
  } catch (e) {}
  return null;
}

export function invalidateCache(keyPattern) {
  if (!keyPattern) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.includes(keyPattern)) {
      memoryCache.delete(k);
      try {
        sessionStorage.removeItem(`univo_cache_${k}`);
      } catch (e) {}
    }
  }
}
