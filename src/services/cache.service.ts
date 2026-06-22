import { Knex } from 'knex';
import { getDb } from '../core/database';
import { Province, Regency, District, Village, RegionChange } from '../types';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private ttl: number;
  private maxSize: number;
  private db: Knex;

  constructor(db?: Knex, options: CacheOptions = {}) {
    this.db = db || getDb();
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 1000;
  }

  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private set<T>(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  // Province methods
  async getProvince(code: string): Promise<Province | undefined> {
    const cached = this.get<Province>(`province:${code}`);
    if (cached) return cached;

    const province = await this.db('provinces').where('code', code).first();
    if (province) this.set(`province:${code}`, province);
    return province;
  }

  async getAllProvinces(): Promise<Province[]> {
    const cached = this.get<Province[]>('provinces:all');
    if (cached) return cached;

    const provinces = await this.db('provinces').where('is_active', true).orderBy('code');
    this.set('provinces:all', provinces);
    return provinces;
  }

  // Regency methods
  async getRegency(code: string): Promise<Regency | undefined> {
    const cached = this.get<Regency>(`regency:${code}`);
    if (cached) return cached;

    const regency = await this.db('regencies').where('code', code).first();
    if (regency) this.set(`regency:${code}`, regency);
    return regency;
  }

  async getRegenciesByProvince(provinceCode: string): Promise<Regency[]> {
    const cached = this.get<Regency[]>(`regencies:${provinceCode}`);
    if (cached) return cached;

    const regencies = await this.db('regencies')
      .where('province_code', provinceCode)
      .where('is_active', true)
      .orderBy('code');
    this.set(`regencies:${provinceCode}`, regencies);
    return regencies;
  }

  // District methods
  async getDistrict(code: string): Promise<District | undefined> {
    const cached = this.get<District>(`district:${code}`);
    if (cached) return cached;

    const district = await this.db('districts').where('code', code).first();
    if (district) this.set(`district:${code}`, district);
    return district;
  }

  async getDistrictsByRegency(regencyCode: string): Promise<District[]> {
    const cached = this.get<District[]>(`districts:${regencyCode}`);
    if (cached) return cached;

    const districts = await this.db('districts')
      .where('regency_code', regencyCode)
      .where('is_active', true)
      .orderBy('code');
    this.set(`districts:${regencyCode}`, districts);
    return districts;
  }

  // Village methods
  async getVillage(code: string): Promise<Village | undefined> {
    const cached = this.get<Village>(`village:${code}`);
    if (cached) return cached;

    const village = await this.db('villages').where('code', code).first();
    if (village) this.set(`village:${code}`, village);
    return village;
  }

  async getVillagesByDistrict(districtCode: string): Promise<Village[]> {
    const cached = this.get<Village[]>(`villages:${districtCode}`);
    if (cached) return cached;

    const villages = await this.db('villages')
      .where('district_code', districtCode)
      .where('is_active', true)
      .orderBy('code');
    this.set(`villages:${districtCode}`, villages);
    return villages;
  }

  // Invalidate related caches when data changes
  invalidateProvince(code: string): void {
    this.cache.delete(`province:${code}`);
    this.cache.delete('provinces:all');
  }

  invalidateRegency(code: string, provinceCode?: string): void {
    this.cache.delete(`regency:${code}`);
    if (provinceCode) {
      this.cache.delete(`regencies:${provinceCode}`);
    }
  }

  invalidateDistrict(code: string, regencyCode?: string): void {
    this.cache.delete(`district:${code}`);
    if (regencyCode) {
      this.cache.delete(`districts:${regencyCode}`);
    }
  }

  invalidateVillage(code: string, districtCode?: string): void {
    this.cache.delete(`village:${code}`);
    if (districtCode) {
      this.cache.delete(`villages:${districtCode}`);
    }
  }

  invalidateAll(): void {
    this.clear();
  }
}
