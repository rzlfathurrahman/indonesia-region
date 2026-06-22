import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Knex } from 'knex';
import { HierarchyService } from '../src/services/hierarchy.service';
import { getTestDb, closeTestDb, seedTestData, cleanupTestDb } from './setup';

describe('HierarchyService', () => {
  let db: Knex;
  let service: HierarchyService;

  beforeAll(async () => {
    db = await getTestDb();
    service = new HierarchyService(db);
    await seedTestData();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    await seedTestData();
  });

  describe('resolveHierarchy', () => {
    it('should resolve province hierarchy', async () => {
      const hierarchy = await service.resolveHierarchy('11');
      expect(hierarchy).toBeDefined();
      expect(hierarchy!.province.code).toBe('11');
      expect(hierarchy!.province.name).toBe('ACEH');
      expect(hierarchy!.regency).toBeUndefined();
    });

    it('should resolve regency hierarchy', async () => {
      const hierarchy = await service.resolveHierarchy('1101');
      expect(hierarchy).toBeDefined();
      expect(hierarchy!.province.code).toBe('11');
      expect(hierarchy!.regency!.code).toBe('1101');
      expect(hierarchy!.regency!.name).toBe('KAB. SIMEULUE');
    });

    it('should resolve district hierarchy', async () => {
      const hierarchy = await service.resolveHierarchy('1101010');
      expect(hierarchy).toBeDefined();
      expect(hierarchy!.province.code).toBe('11');
      expect(hierarchy!.regency!.code).toBe('1101');
      expect(hierarchy!.district!.code).toBe('1101010');
      expect(hierarchy!.district!.name).toBe('TEUPAH SELATAN');
    });

    it('should resolve village hierarchy', async () => {
      const hierarchy = await service.resolveHierarchy('1101010001');
      expect(hierarchy).toBeDefined();
      expect(hierarchy!.province.code).toBe('11');
      expect(hierarchy!.regency!.code).toBe('1101');
      expect(hierarchy!.district!.code).toBe('1101010');
      expect(hierarchy!.village!.code).toBe('1101010001');
      expect(hierarchy!.village!.name).toBe('KUTA PADANG');
    });

    it('should return null for non-existent code', async () => {
      const hierarchy = await service.resolveHierarchy('99');
      expect(hierarchy).toBeNull();
    });
  });

  describe('getFullAddress', () => {
    it('should return full address for village', async () => {
      const address = await service.getFullAddress('1101010001');
      expect(address).toBeDefined();
      expect(address!.province_code).toBe('11');
      expect(address!.province_name).toBe('ACEH');
      expect(address!.regency_code).toBe('1101');
      expect(address!.regency_name).toBe('KAB. SIMEULUE');
      expect(address!.district_code).toBe('1101010');
      expect(address!.district_name).toBe('TEUPAH SELATAN');
      expect(address!.village_code).toBe('1101010001');
      expect(address!.village_name).toBe('KUTA PADANG');
      expect(address!.full_path).toContain('KUTA PADANG');
      expect(address!.full_path).toContain('TEUPAH SELATAN');
      expect(address!.full_path).toContain('KAB. SIMEULUE');
      expect(address!.full_path).toContain('ACEH');
    });

    it('should return full address for district', async () => {
      const address = await service.getFullAddress('1101010');
      expect(address).toBeDefined();
      expect(address!.district_code).toBe('1101010');
      expect(address!.village_code).toBeUndefined();
    });
  });

  describe('getChildren', () => {
    it('should return regencies for province', async () => {
      const children = await service.getChildren('11');
      expect(children.level).toBe('regency');
      expect(children.items).toHaveLength(2);
      expect(children.items[0].code).toBe('1101');
    });

    it('should return districts for regency', async () => {
      const children = await service.getChildren('1101');
      expect(children.level).toBe('district');
      expect(children.items).toHaveLength(2);
    });

    it('should return villages for district', async () => {
      const children = await service.getChildren('1101010');
      expect(children.level).toBe('village');
      expect(children.items).toHaveLength(2);
    });

    it('should return empty for village', async () => {
      const children = await service.getChildren('1101010001');
      expect(children.level).toBe('none');
      expect(children.items).toHaveLength(0);
    });
  });

  describe('getAncestors', () => {
    it('should return all ancestors for village', async () => {
      const ancestors = await service.getAncestors('1101010001');
      expect(ancestors).toHaveLength(3);
      expect(ancestors[0].district_code).toBe('1101010');
      expect(ancestors[1].regency_code).toBe('1101');
      expect(ancestors[2].province_code).toBe('11');
    });
  });

  describe('searchByKeyword', () => {
    it('should search across all levels', async () => {
      const results = await service.searchByKeyword('ACEH');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.level === 'province')).toBe(true);
    });
  });
});
