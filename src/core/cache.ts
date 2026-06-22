import { Knex } from 'knex';

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  enableStats?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

export class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl: number;
  private maxSize: number;
  private enableStats: boolean;

  // Stats
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 10000;
    this.enableStats = options.enableStats !== false;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.enableStats) this.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      if (this.enableStats) this.misses++;
      return null;
    }

    if (this.enableStats) {
      this.hits++;
      entry.hits++;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, customTtl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + (customTtl || this.ttl),
      hits: 0
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
      evictions: this.evictions
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  // Pattern-based invalidation
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  // Get or compute pattern
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const value = await computeFn();
    this.set(key, value, customTtl);
    return value;
  }

  private evictLRU(): void {
    // Find entry with lowest hits (or oldest if tie)
    let minHits = Infinity;
    let minKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }

    if (minKey) {
      this.cache.delete(minKey);
      this.evictions++;
    }
  }
}

// Singleton cache instance
let defaultCache: PerformanceCache | null = null;

export function getDefaultCache(options?: CacheOptions): PerformanceCache {
  if (!defaultCache) {
    defaultCache = new PerformanceCache(options);
  }
  return defaultCache;
}

export function clearDefaultCache(): void {
  if (defaultCache) {
    defaultCache.clear();
    defaultCache = null;
  }
}
