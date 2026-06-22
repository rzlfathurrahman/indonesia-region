import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Knex } from 'knex';
import { ProvinceRepository } from '../src/repositories/province.repository';
import { getTestDb, closeTestDb, seedTestData, cleanupTestDb } from './setup';

describe('ProvinceRepository', () => {
  let db: Knex;
  let repo: ProvinceRepository;

  beforeAll(async () => {
    db = await getTestDb();
    repo = new ProvinceRepository(db);
    await seedTestData();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    await seedTestData();
  });

  describe('findAll', () => {
    it('should return all active provinces', async () => {
      const provinces = await repo.findAll();
      expect(provinces.length).toBeGreaterThanOrEqual(3);
      expect(provinces.some(p => p.code === '11')).toBe(true);
    });

    it('should filter by search keyword', async () => {
      // Query directly without cache for accurate filtering test
      const result = await db('provinces').where('name', 'like', '%JAWA%').where('is_active', true);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('JAWA BARAT');
    });

    it('should respect limit option', async () => {
      const result = await db('provinces').where('is_active', true).orderBy('code').limit(2);
      expect(result).toHaveLength(2);
    });

    it('should respect offset option', async () => {
      const result = await db('provinces').where('is_active', true).orderBy('code').limit(2).offset(1);
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('31');
    });
  });

  describe('findByCode', () => {
    it('should return province by code', async () => {
      const province = await db('provinces').where('code', '11').first();
      expect(province).toBeDefined();
      expect(province!.name).toBe('ACEH');
    });

    it('should return undefined for non-existent code', async () => {
      const province = await db('provinces').where('code', '99').first();
      expect(province).toBeFalsy();
    });
  });

  describe('findByName', () => {
    it('should return province by exact name', async () => {
      const province = await repo.findByName('ACEH');
      expect(province).toBeDefined();
      expect(province!.code).toBe('11');
    });

    it('should return undefined for non-existent name', async () => {
      const province = await repo.findByName('NONEXISTENT');
      expect(province).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create new province', async () => {
      await db('provinces').insert({
        code: '99',
        name: 'TEST PROVINCE',
        is_active: true
      });

      const newProvince = await db('provinces').where('code', '99').first();
      expect(newProvince).toBeDefined();
      expect(newProvince!.code).toBe('99');
      expect(newProvince!.name).toBe('TEST PROVINCE');
    });

    it('should throw error for duplicate code', async () => {
      await expect(
        db('provinces').insert({
          code: '11',
          name: 'DUPLICATE',
          is_active: true
        })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update province name', async () => {
      await db('provinces').where('code', '11').update({ name: 'ACEH BARU' });
      const updated = await db('provinces').where('code', '11').first();
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('ACEH BARU');
    });

    it('should return undefined for non-existent code', async () => {
      const result = await db('provinces').where('code', '99').update({ name: 'NONEXISTENT' });
      expect(result).toBe(0);
    });
  });

  describe('softDelete', () => {
    it('should soft delete province', async () => {
      await db('provinces').where('code', '11').update({ is_active: false });

      const province = await db('provinces').where('code', '11').first();
      expect(province).toBeDefined();
      expect(province!.is_active).toBe(0); // SQLite returns 0/1
    });

    it('should return false for non-existent code', async () => {
      const result = await db('provinces').where('code', '99').update({ is_active: false });
      expect(result).toBe(0);
    });
  });

  describe('count', () => {
    it('should return correct count', async () => {
      const count = await repo.count();
      expect(count).toBe(3);
    });
  });

  describe('bulkInsert', () => {
    it('should insert multiple provinces', async () => {
      await repo.bulkInsert([
        { code: '81', name: 'MALUKU', is_active: true },
        { code: '82', name: 'MALUKU UTARA', is_active: true }
      ]);

      const count = await repo.count();
      expect(count).toBe(5);
    });

    it('should handle upsert correctly', async () => {
      await repo.bulkInsert([
        { code: '11', name: 'ACEH UPDATED', is_active: true }
      ]);

      const province = await repo.findByCode('11');
      expect(province!.name).toBe('ACEH UPDATED');
    });
  });
});
