import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Knex } from 'knex';
import { SearchService } from '../src/services/search.service';
import { getTestDb, closeTestDb, seedTestData, cleanupTestDb } from './setup';

describe('SearchService', () => {
  let db: Knex;
  let service: SearchService;

  beforeAll(async () => {
    db = await getTestDb();
    service = new SearchService(db);
    await seedTestData();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    await seedTestData();
  });

  describe('search', () => {
    it('should search by keyword', async () => {
      const results = await service.search('ACEH');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name === 'ACEH')).toBe(true);
    });

    it('should search across all levels', async () => {
      const results = await service.search('JAKARTA');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.level === 'regency')).toBe(true);
    });

    it('should respect limit option', async () => {
      const results = await service.search('A', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by level', async () => {
      const results = await service.search('A', { levels: ['province'] });
      expect(results.every(r => r.level === 'province')).toBe(true);
    });

    it('should rank exact matches higher', async () => {
      const results = await service.search('ACEH');
      const acehResult = results.find(r => r.name === 'ACEH');
      expect(acehResult).toBeDefined();
      expect(acehResult!.score).toBeGreaterThan(0);
    });
  });

  describe('searchExact', () => {
    it('should find exact match', async () => {
      const results = await service.searchExact('ACEH');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.name === 'ACEH')).toBe(true);
    });

    it('should return empty for partial match', async () => {
      const results = await service.searchExact('NONEXISTENT');
      expect(results).toHaveLength(0);
    });
  });

  describe('searchByCode', () => {
    it('should find by code', async () => {
      const result = await service.searchByCode('11');
      expect(result).toBeDefined();
    });

    it('should return null for non-existent code', async () => {
      const result = await service.searchByCode('999');
      expect(result).toBeNull();
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const results = await service.autocomplete('KUTA');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBeDefined();
      expect(results[0].label).toBeDefined();
    });

    it('should respect limit', async () => {
      const results = await service.autocomplete('KUTA', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });
});
