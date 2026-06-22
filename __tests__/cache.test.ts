import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceCache } from '../src/core/cache';

describe('PerformanceCache', () => {
  let cache: PerformanceCache;

  beforeEach(() => {
    cache = new PerformanceCache({
      ttl: 1000, // 1 second for testing
      maxSize: 100,
      enableStats: true
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('basic operations', () => {
    it('should set and get value', () => {
      cache.set('key1', 'value1');
      const value = cache.get<string>('key1');
      expect(value).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      const value = cache.get<string>('nonexistent');
      expect(value).toBeNull();
    });

    it('should delete value', () => {
      cache.set('key1', 'value1');
      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL', () => {
    it('should expire after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict when max size reached', () => {
      const smallCache = new PerformanceCache({ maxSize: 3, enableStats: true });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict key1

      expect(smallCache.size()).toBe(3);
      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key4')).toBe('value4');
    });
  });

  describe('stats', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });

    it('should reset stats', () => {
      cache.set('key1', 'value1');
      cache.get('key1');

      cache.resetStats();
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate by pattern', () => {
      cache.set('province:11', 'value1');
      cache.set('province:12', 'value2');
      cache.set('regency:1101', 'value3');

      const count = cache.invalidatePattern('^province:');
      expect(count).toBe(2);
      expect(cache.get('province:11')).toBeNull();
      expect(cache.get('province:12')).toBeNull();
      expect(cache.get('regency:1101')).toBe('value3');
    });
  });

  describe('getOrCompute', () => {
    it('should compute value if not cached', async () => {
      let computeCount = 0;
      const computeFn = async () => {
        computeCount++;
        return 'computed';
      };

      const value1 = await cache.getOrCompute('key1', computeFn);
      expect(value1).toBe('computed');
      expect(computeCount).toBe(1);

      const value2 = await cache.getOrCompute('key1', computeFn);
      expect(value2).toBe('computed');
      expect(computeCount).toBe(1); // Should not compute again
    });
  });
});
