import { Knex } from 'knex';
import { PerformanceCache } from './cache';

export interface QueryOptions {
  cache?: boolean;
  cacheTtl?: number;
  cacheKey?: string;
  select?: string[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class QueryBuilder {
  private db: Knex;
  private cache: PerformanceCache;

  constructor(db: Knex, cache?: PerformanceCache) {
    this.db = db;
    this.cache = cache || new PerformanceCache();
  }

  // Province queries with caching
  async getProvinces(options: QueryOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || 'provinces:all';

    if (options.cache !== false) {
      const cached = this.cache.get<any[]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.db('provinces').where('is_active', true);

    if (options.select) {
      query = query.select(options.select);
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    } else {
      query = query.orderBy('code');
    }

    const result = await query;

    if (options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  async getProvince(code: string, options: QueryOptions = {}): Promise<any | null> {
    const cacheKey = options.cacheKey || `province:${code}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.db('provinces').where('code', code).first() || null;

    if (result && options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  // Regency queries with caching
  async getRegencies(provinceCode?: string, options: QueryOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || `regencies:${provinceCode || 'all'}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any[]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.db('regencies').where('is_active', true);

    if (provinceCode) {
      query = query.where('province_code', provinceCode);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    query = query.orderBy('code');

    const result = await query;

    if (options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  async getRegency(code: string, options: QueryOptions = {}): Promise<any | null> {
    const cacheKey = options.cacheKey || `regency:${code}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.db('regencies').where('code', code).first() || null;

    if (result && options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  // District queries with caching
  async getDistricts(regencyCode?: string, options: QueryOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || `districts:${regencyCode || 'all'}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any[]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.db('districts').where('is_active', true);

    if (regencyCode) {
      query = query.where('regency_code', regencyCode);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    query = query.orderBy('code');

    const result = await query;

    if (options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  async getDistrict(code: string, options: QueryOptions = {}): Promise<any | null> {
    const cacheKey = options.cacheKey || `district:${code}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.db('districts').where('code', code).first() || null;

    if (result && options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  // Village queries with caching
  async getVillages(districtCode?: string, options: QueryOptions = {}): Promise<any[]> {
    const cacheKey = options.cacheKey || `villages:${districtCode || 'all'}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any[]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.db('villages').where('is_active', true);

    if (districtCode) {
      query = query.where('district_code', districtCode);
    }

    if (options.select) {
      query = query.select(options.select);
    }

    query = query.orderBy('code');

    const result = await query;

    if (options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  async getVillage(code: string, options: QueryOptions = {}): Promise<any | null> {
    const cacheKey = options.cacheKey || `village:${code}`;

    if (options.cache !== false) {
      const cached = this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }

    const result = await this.db('villages').where('code', code).first() || null;

    if (result && options.cache !== false) {
      this.cache.set(cacheKey, result, options.cacheTtl);
    }

    return result;
  }

  // Batch queries for better performance
  async getBatchProvinces(codes: string[]): Promise<any[]> {
    const cacheKey = `batch:provinces:${codes.sort().join(',')}`;

    const cached = this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db('provinces')
      .whereIn('code', codes)
      .where('is_active', true)
      .orderBy('code');

    this.cache.set(cacheKey, result, 60000); // 1 minute cache for batch

    return result;
  }

  async getBatchRegencies(codes: string[]): Promise<any[]> {
    const cacheKey = `batch:regencies:${codes.sort().join(',')}`;

    const cached = this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db('regencies')
      .whereIn('code', codes)
      .where('is_active', true)
      .orderBy('code');

    this.cache.set(cacheKey, result, 60000);

    return result;
  }

  // Hierarchy query with single join
  async getHierarchy(code: string): Promise<any | null> {
    const cacheKey = `hierarchy:${code}`;

    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const codeLen = code.length;

    if (codeLen === 10) {
      // Village - join all levels
      const result = await this.db('villages')
        .join('districts', 'villages.district_code', 'districts.code')
        .join('regencies', 'districts.regency_code', 'regencies.code')
        .join('provinces', 'regencies.province_code', 'provinces.code')
        .where('villages.code', code)
        .select(
          'villages.code as village_code',
          'villages.name as village_name',
          'districts.code as district_code',
          'districts.name as district_name',
          'regencies.code as regency_code',
          'regencies.name as regency_name',
          'provinces.code as province_code',
          'provinces.name as province_name'
        )
        .first();

      if (result) {
        this.cache.set(cacheKey, result, 300000); // 5 minutes
      }

      return result || null;
    }

    if (codeLen === 7) {
      // District
      const result = await this.db('districts')
        .join('regencies', 'districts.regency_code', 'regencies.code')
        .join('provinces', 'regencies.province_code', 'provinces.code')
        .where('districts.code', code)
        .select(
          'districts.code as district_code',
          'districts.name as district_name',
          'regencies.code as regency_code',
          'regencies.name as regency_name',
          'provinces.code as province_code',
          'provinces.name as province_name'
        )
        .first();

      if (result) {
        this.cache.set(cacheKey, result, 300000);
      }

      return result || null;
    }

    if (codeLen === 4) {
      // Regency
      const result = await this.db('regencies')
        .join('provinces', 'regencies.province_code', 'provinces.code')
        .where('regencies.code', code)
        .select(
          'regencies.code as regency_code',
          'regencies.name as regency_name',
          'provinces.code as province_code',
          'provinces.name as province_name'
        )
        .first();

      if (result) {
        this.cache.set(cacheKey, result, 300000);
      }

      return result || null;
    }

    if (codeLen === 2) {
      // Province
      const result = await this.db('provinces')
        .where('code', code)
        .select('code as province_code', 'name as province_name')
        .first();

      if (result) {
        this.cache.set(cacheKey, result, 300000);
      }

      return result || null;
    }

    return null;
  }

  // Invalidate cache
  invalidateProvince(code?: string): void {
    if (code) {
      this.cache.delete(`province:${code}`);
    }
    this.cache.invalidatePattern('^provinces:');
    this.cache.invalidatePattern('^batch:provinces:');
  }

  invalidateRegency(code?: string, provinceCode?: string): void {
    if (code) {
      this.cache.delete(`regency:${code}`);
    }
    this.cache.invalidatePattern(`^regencies:${provinceCode || ''}`);
    this.cache.invalidatePattern('^batch:regencies:');
  }

  invalidateDistrict(code?: string, regencyCode?: string): void {
    if (code) {
      this.cache.delete(`district:${code}`);
    }
    this.cache.invalidatePattern(`^districts:${regencyCode || ''}`);
  }

  invalidateVillage(code?: string, districtCode?: string): void {
    if (code) {
      this.cache.delete(`village:${code}`);
    }
    this.cache.invalidatePattern(`^villages:${districtCode || ''}`);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getCacheStats(): any {
    return this.cache.getStats();
  }
}
