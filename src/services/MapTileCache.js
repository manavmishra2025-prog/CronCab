// src/services/MapTileCache.js
// OS Concept: Virtual Memory — LRU Page Replacement Algorithm
//
// Problem Solved:
//   - Map re-fetches the same tiles repeatedly → slow, high data usage, battery drain
//   - Memory grows unbounded if all visited tiles are cached
//
// Solution: LRU (Least Recently Used) Page Replacement
//   Maintain a cache of N map tiles (pages). When cache is full and a new tile is needed:
//     1. Evict the tile that was LEAST RECENTLY USED (cold page)
//     2. Load the new tile (page fault → page load)
//   Implementation: HashMap (O(1) lookup) + Doubly Linked List (O(1) eviction)
//   This is exactly how OS virtual memory managers work (Linux uses a variant of LRU).

const DEFAULT_CACHE_SIZE = 50; // Max 50 tiles in memory

// DLL Node
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
    this.accessedAt = Date.now();
    this.hitCount = 0;
  }
}

class LRUCache {
  constructor(capacity = DEFAULT_CACHE_SIZE) {
    this.capacity = capacity;
    this._map = new Map();   // key → Node (O(1) lookup)

    // Sentinel nodes (dummy head & tail — simplify edge cases)
    this._head = new Node(null, null); // MRU end
    this._tail = new Node(null, null); // LRU end
    this._head.next = this._tail;
    this._tail.prev = this._head;

    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  // ─── Get (page access) ──────────────────────────────────────────────────

  get(key) {
    if (!this._map.has(key)) {
      this._misses++;
      return null; // Page fault
    }
    const node = this._map.get(key);
    node.accessedAt = Date.now();
    node.hitCount++;
    this._moveToFront(node); // Mark as most recently used
    this._hits++;
    return node.value;
  }

  // ─── Put (page load) ────────────────────────────────────────────────────

  put(key, value) {
    if (this._map.has(key)) {
      const node = this._map.get(key);
      node.value = value;
      node.accessedAt = Date.now();
      this._moveToFront(node);
      return;
    }

    const node = new Node(key, value);
    this._map.set(key, node);
    this._addToFront(node);

    if (this._map.size > this.capacity) {
      // Evict LRU page
      const evicted = this._removeLRU();
      this._map.delete(evicted.key);
      this._evictions++;
      console.log(`[TileCache] Evicted tile: ${evicted.key} (LRU)`);
    }
  }

  has(key) {
    return this._map.has(key);
  }

  // ─── DLL Operations ─────────────────────────────────────────────────────

  _addToFront(node) {
    node.prev = this._head;
    node.next = this._head.next;
    this._head.next.prev = node;
    this._head.next = node;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToFront(node) {
    this._remove(node);
    this._addToFront(node);
  }

  _removeLRU() {
    const lru = this._tail.prev;
    this._remove(lru);
    return lru;
  }

  // ─── Stats ──────────────────────────────────────────────────────────────

  get stats() {
    const total = this._hits + this._misses;
    return {
      size: this._map.size,
      capacity: this.capacity,
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRate: total > 0 ? Math.round((this._hits / total) * 100) : 0,
    };
  }

  clear() {
    this._map.clear();
    this._head.next = this._tail;
    this._tail.prev = this._head;
  }
}

// ─── Map Tile Manager ────────────────────────────────────────────────────────
// Wraps LRUCache with tile-specific logic: tile key generation, fetch simulation

class MapTileManager {
  constructor(cacheSize = DEFAULT_CACHE_SIZE) {
    this._cache = new LRUCache(cacheSize);
    this._fetchQueue = new Set(); // Tiles currently being fetched (prevent duplicate fetches)
  }

  /**
   * Get a tile. Returns from cache (page hit) or fetches (page fault).
   * Tile key: `{zoom}/{x}/{y}` — standard slippy map format
   */
  async getTile(zoom, x, y, tileSource = 'osm') {
    const key = `${tileSource}/${zoom}/${x}/${y}`;

    // Page hit — return immediately
    const cached = this._cache.get(key);
    if (cached) {
      return { data: cached, source: 'cache', key };
    }

    // Page fault — check if already fetching (avoid duplicate network requests)
    if (this._fetchQueue.has(key)) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          const data = this._cache.get(key);
          if (data) {
            clearInterval(interval);
            resolve({ data, source: 'cache_after_fetch', key });
          }
        }, 50);
      });
    }

    // Fetch the tile
    this._fetchQueue.add(key);
    try {
      const tileData = await this._fetchTile(zoom, x, y, tileSource);
      this._cache.put(key, tileData);
      return { data: tileData, source: 'network', key };
    } finally {
      this._fetchQueue.delete(key);
    }
  }

  /**
   * Prefetch tiles around current viewport (anticipatory paging)
   * OS analogy: demand paging + prefetching for spatial locality
   */
  async prefetchAround(zoom, centerX, centerY, radius = 2) {
    const prefetchPromises = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = `osm/${zoom}/${centerX + dx}/${centerY + dy}`;
        if (!this._cache.has(key)) {
          prefetchPromises.push(this.getTile(zoom, centerX + dx, centerY + dy));
        }
      }
    }
    await Promise.allSettled(prefetchPromises);
    console.log(`[TileCache] Prefetched ${prefetchPromises.length} tiles around (${centerX},${centerY})`);
  }

  async _fetchTile(zoom, x, y, source) {
    // In a real app: fetch from tile CDN
    // e.g., `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`
    // Here: simulated async fetch
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
    return { zoom, x, y, source, fetchedAt: Date.now() };
  }

  get cacheStats() {
    return this._cache.stats;
  }

  evictAll() {
    this._cache.clear();
  }
}

export const mapTileCache = new MapTileManager(50);
export { LRUCache };
