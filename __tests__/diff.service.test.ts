import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Knex } from 'knex';
import { DiffService } from '../src/services/diff.service';
import { getTestDb, closeTestDb, seedTestData, cleanupTestDb } from './setup';

describe('DiffService', () => {
  let db: Knex;
  let service: DiffService;

  beforeAll(async () => {
    db = await getTestDb();
    service = new DiffService(db);
    await seedTestData();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    await seedTestData();
  });

  describe('compareWithSource', () => {
    it('should detect no changes with same data', async () => {
      const diff = await service.compareWithSource({
        provinces: [
          { code: '11', name: 'ACEH' },
          { code: '31', name: 'DKI JAKARTA' },
          { code: '32', name: 'JAWA BARAT' }
        ],
        regencies: [
          { code: '1101', province_code: '11', name: 'KAB. SIMEULUE' },
          { code: '1102', province_code: '11', name: 'KAB. ACEH SINGKIL' },
          { code: '3171', province_code: '31', name: 'KOTA JAKARTA SELATAN' },
          { code: '3172', province_code: '31', name: 'KOTA JAKARTA TIMUR' }
        ],
        districts: [
          { code: '1101010', regency_code: '1101', name: 'TEUPAH SELATAN' },
          { code: '1101020', regency_code: '1101', name: 'SIMEULUE TIMUR' },
          { code: '3171010', regency_code: '3171', name: 'JAGAKARSA' },
          { code: '3171020', regency_code: '3171', name: 'PASAR MINGGU' }
        ],
        villages: [
          { code: '1101010001', district_code: '1101010', name: 'KUTA PADANG' },
          { code: '1101010002', district_code: '1101010', name: 'RAKET' },
          { code: '3171010001', district_code: '3171010', name: 'CILANDAK TIMUR' },
          { code: '3171010002', district_code: '3171010', name: 'JAGAKARSA' }
        ]
      });

      expect(diff.summary.total_added).toBe(0);
      expect(diff.summary.total_removed).toBe(0);
      expect(diff.summary.total_modified).toBe(0);
    });

    it('should detect added provinces', async () => {
      const diff = await service.compareWithSource({
        provinces: [
          { code: '11', name: 'ACEH' },
          { code: '31', name: 'DKI JAKARTA' },
          { code: '32', name: 'JAWA BARAT' },
          { code: '99', name: 'NEW PROVINCE' }
        ],
        regencies: [],
        districts: [],
        villages: []
      });

      expect(diff.provinces.added).toHaveLength(1);
      expect(diff.provinces.added[0].code).toBe('99');
    });

    it('should detect removed provinces', async () => {
      const diff = await service.compareWithSource({
        provinces: [
          { code: '11', name: 'ACEH' },
          { code: '31', name: 'DKI JAKARTA' }
        ],
        regencies: [],
        districts: [],
        villages: []
      });

      expect(diff.provinces.removed).toHaveLength(1);
      expect(diff.provinces.removed[0].code).toBe('32');
    });

    it('should detect modified provinces', async () => {
      const diff = await service.compareWithSource({
        provinces: [
          { code: '11', name: 'ACEH BARU' },
          { code: '31', name: 'DKI JAKARTA' },
          { code: '32', name: 'JAWA BARAT' }
        ],
        regencies: [],
        districts: [],
        villages: []
      });

      expect(diff.provinces.modified).toHaveLength(1);
      expect(diff.provinces.modified[0].code).toBe('11');
      expect(diff.provinces.modified[0].old_name).toBe('ACEH');
      expect(diff.provinces.modified[0].new_name).toBe('ACEH BARU');
    });
  });

  describe('generateReport', () => {
    it('should generate report text', async () => {
      const diff = await service.compareWithSource({
        provinces: [
          { code: '11', name: 'ACEH' },
          { code: '31', name: 'DKI JAKARTA' },
          { code: '32', name: 'JAWA BARAT' },
          { code: '99', name: 'NEW PROVINCE' }
        ],
        regencies: [],
        districts: [],
        villages: []
      });

      const report = service.generateReport(diff);
      expect(report).toContain('INDONESIA WILAYAH DIFF REPORT');
      expect(report).toContain('SUMMARY');
      expect(report).toContain('Added: 1');
      expect(report).toContain('NEW PROVINCE');
    });
  });
});
