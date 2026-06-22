import { Knex } from 'knex';
import { getDb } from '../core/database';
import { Province, Regency, District, Village } from '../types';

export interface HierarchyPath {
  province: Province;
  regency?: Regency;
  district?: District;
  village?: Village;
}

export interface FullAddress {
  province_code: string;
  province_name: string;
  regency_code?: string;
  regency_name?: string;
  district_code?: string;
  district_name?: string;
  village_code?: string;
  village_name?: string;
  full_path: string;
}

export class HierarchyService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async resolveHierarchy(code: string): Promise<HierarchyPath | null> {
    const codeLen = code.length;

    // Village (10 digits)
    if (codeLen === 10) {
      const village = await this.db('villages').where('code', code).first();
      if (!village) return null;

      const district = await this.db('districts').where('code', village.district_code).first();
      const regency = await this.db('regencies').where('code', district?.regency_code).first();
      const province = await this.db('provinces').where('code', regency?.province_code).first();

      return { province, regency, district, village };
    }

    // District (7 digits)
    if (codeLen === 7) {
      const district = await this.db('districts').where('code', code).first();
      if (!district) return null;

      const regency = await this.db('regencies').where('code', district.regency_code).first();
      const province = await this.db('provinces').where('code', regency?.province_code).first();

      return { province, regency, district };
    }

    // Regency (4 digits)
    if (codeLen === 4) {
      const regency = await this.db('regencies').where('code', code).first();
      if (!regency) return null;

      const province = await this.db('provinces').where('code', regency.province_code).first();

      return { province, regency };
    }

    // Province (2 digits)
    if (codeLen === 2) {
      const province = await this.db('provinces').where('code', code).first();
      if (!province) return null;

      return { province };
    }

    return null;
  }

  async getFullAddress(code: string): Promise<FullAddress | null> {
    const hierarchy = await this.resolveHierarchy(code);
    if (!hierarchy) return null;

    const parts: string[] = [];

    if (hierarchy.village) {
      parts.unshift(hierarchy.village.name);
    }
    if (hierarchy.district) {
      parts.unshift(hierarchy.district.name);
    }
    if (hierarchy.regency) {
      parts.unshift(hierarchy.regency.name);
    }
    if (hierarchy.province) {
      parts.unshift(hierarchy.province.name);
    }

    return {
      province_code: hierarchy.province.code,
      province_name: hierarchy.province.name,
      regency_code: hierarchy.regency?.code,
      regency_name: hierarchy.regency?.name,
      district_code: hierarchy.district?.code,
      district_name: hierarchy.district?.name,
      village_code: hierarchy.village?.code,
      village_name: hierarchy.village?.name,
      full_path: parts.join(', ')
    };
  }

  async getChildren(parentCode: string): Promise<{ level: string; items: any[] }> {
    const codeLen = parentCode.length;

    if (codeLen === 2) {
      const regencies = await this.db('regencies')
        .where('province_code', parentCode)
        .where('is_active', true)
        .orderBy('code');
      return { level: 'regency', items: regencies };
    }

    if (codeLen === 4) {
      const districts = await this.db('districts')
        .where('regency_code', parentCode)
        .where('is_active', true)
        .orderBy('code');
      return { level: 'district', items: districts };
    }

    if (codeLen === 7) {
      const villages = await this.db('villages')
        .where('district_code', parentCode)
        .where('is_active', true)
        .orderBy('code');
      return { level: 'village', items: villages };
    }

    return { level: 'none', items: [] };
  }

  async getAncestors(code: string): Promise<FullAddress[]> {
    const results: FullAddress[] = [];
    const codeLen = code.length;

    // Get village's district
    if (codeLen >= 7) {
      const districtCode = code.substring(0, 7);
      const addr = await this.getFullAddress(districtCode);
      if (addr) results.push(addr);
    }

    // Get district's regency
    if (codeLen >= 4) {
      const regencyCode = code.substring(0, 4);
      const addr = await this.getFullAddress(regencyCode);
      if (addr) results.push(addr);
    }

    // Get regency's province
    if (codeLen >= 2) {
      const provinceCode = code.substring(0, 2);
      const addr = await this.getFullAddress(provinceCode);
      if (addr) results.push(addr);
    }

    return results;
  }

  async searchByKeyword(keyword: string, limit: number = 20): Promise<Array<FullAddress & { level: string }>> {
    const results: Array<FullAddress & { level: string }> = [];
    const searchLimit = Math.ceil(limit / 4);

    // Search villages
    const villages = await this.db('villages')
      .where('name', 'like', `%${keyword}%`)
      .where('is_active', true)
      .limit(searchLimit);

    for (const v of villages) {
      const addr = await this.getFullAddress(v.code);
      if (addr) results.push({ ...addr, level: 'village' });
    }

    // Search districts
    const districts = await this.db('districts')
      .where('name', 'like', `%${keyword}%`)
      .where('is_active', true)
      .limit(searchLimit);

    for (const d of districts) {
      const addr = await this.getFullAddress(d.code);
      if (addr) results.push({ ...addr, level: 'district' });
    }

    // Search regencies
    const regencies = await this.db('regencies')
      .where('name', 'like', `%${keyword}%`)
      .where('is_active', true)
      .limit(searchLimit);

    for (const r of regencies) {
      const addr = await this.getFullAddress(r.code);
      if (addr) results.push({ ...addr, level: 'regency' });
    }

    // Search provinces
    const provinces = await this.db('provinces')
      .where('name', 'like', `%${keyword}%`)
      .where('is_active', true)
      .limit(searchLimit);

    for (const p of provinces) {
      const addr = await this.getFullAddress(p.code);
      if (addr) results.push({ ...addr, level: 'province' });
    }

    return results.slice(0, limit);
  }
}
