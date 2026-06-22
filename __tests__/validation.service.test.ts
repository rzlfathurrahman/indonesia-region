import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Knex } from 'knex';
import { ValidationService } from '../src/services/validation.service';
import { getTestDb, closeTestDb, seedTestData, cleanupTestDb } from './setup';

describe('ValidationService', () => {
  let db: Knex;
  let service: ValidationService;

  beforeAll(async () => {
    db = await getTestDb();
    service = new ValidationService(db);
    await seedTestData();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    await seedTestData();
  });

  describe('validateCode', () => {
    it('should validate correct province code', () => {
      const result = service.validateCode('11');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate correct regency code', () => {
      const result = service.validateCode('1101');
      expect(result.valid).toBe(true);
    });

    it('should validate correct district code', () => {
      const result = service.validateCode('1101010');
      expect(result.valid).toBe(true);
    });

    it('should validate correct village code', () => {
      const result = service.validateCode('1101010001');
      expect(result.valid).toBe(true);
    });

    it('should reject empty code', () => {
      const result = service.validateCode('');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    });

    it('should reject non-numeric code', () => {
      const result = service.validateCode('ABC');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should reject invalid length', () => {
      const result = service.validateCode('123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_LENGTH')).toBe(true);
    });
  });

  describe('validateHierarchy', () => {
    it('should validate existing village with parent', async () => {
      // Use a code that exists but check parent validation
      const result = await service.validateHierarchy('1101010001');
      // It will have DUPLICATE error since code exists, but parent validation passes
      expect(result.errors.some(e => e.code === 'PARENT_NOT_FOUND')).toBe(false);
    });

    it('should reject code with non-existent parent', async () => {
      const result = await service.validateHierarchy('9999999999');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'PARENT_NOT_FOUND')).toBe(true);
    });
  });

  describe('validateName', () => {
    it('should validate correct name', async () => {
      const result = await service.validateName('TEST PROVINCE', 'province');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', async () => {
      const result = await service.validateName('', 'province');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject duplicate name', async () => {
      const result = await service.validateName('ACEH', 'province');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NAME')).toBe(true);
    });
  });

  describe('getLevelByCode', () => {
    it('should return correct level for province', () => {
      expect(service.getLevelByCode('11')).toBe('province');
    });

    it('should return correct level for regency', () => {
      expect(service.getLevelByCode('1101')).toBe('regency');
    });

    it('should return correct level for district', () => {
      expect(service.getLevelByCode('1101010')).toBe('district');
    });

    it('should return correct level for village', () => {
      expect(service.getLevelByCode('1101010001')).toBe('village');
    });

    it('should return null for invalid code', () => {
      expect(service.getLevelByCode('123')).toBeNull();
    });
  });

  describe('getParentCode', () => {
    it('should return parent code for village', () => {
      expect(service.getParentCode('1101010001')).toBe('1101010');
    });

    it('should return parent code for district', () => {
      expect(service.getParentCode('1101010')).toBe('1101');
    });

    it('should return parent code for regency', () => {
      expect(service.getParentCode('1101')).toBe('11');
    });

    it('should return null for province', () => {
      expect(service.getParentCode('11')).toBeNull();
    });
  });
});
