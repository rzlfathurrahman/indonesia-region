import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface SearchResult {
  code: string;
  name: string;
  level: 'province' | 'regency' | 'district' | 'village';
  score: number;
  parent_info?: {
    province_code?: string;
    province_name?: string;
    regency_code?: string;
    regency_name?: string;
    district_code?: string;
    district_name?: string;
  };
  full_path?: string;
}

export interface SearchOptions {
  levels?: Array<'province' | 'regency' | 'district' | 'village'>;
  limit?: number;
  exactMatch?: boolean;
  parentCode?: string;
  includeInactive?: boolean;
}

export class SearchService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async search(keyword: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      levels = ['province', 'regency', 'district', 'village'],
      limit = 50,
      exactMatch = false,
      parentCode,
      includeInactive = false
    } = options;

    const results: SearchResult[] = [];
    const searchLimit = Math.ceil(limit / levels.length);

    const activeFilter = includeInactive ? '' : 'AND is_active = 1';
    const activeFilterWithPrefix = includeInactive ? '' : 'AND r.is_active = 1';

    // Search provinces
    if (levels.includes('province')) {
      const provinceFilter = includeInactive ? '' : 'AND is_active = 1';
      const query = exactMatch
        ? `SELECT code, name FROM provinces WHERE name = ? ${provinceFilter} LIMIT ?`
        : `SELECT code, name FROM provinces WHERE name LIKE ? ${provinceFilter} LIMIT ?`;

      const params = exactMatch ? [keyword, searchLimit] : [`%${keyword}%`, searchLimit];
      const provinces = await this.db.raw(query, params);

      for (const p of provinces) {
        results.push({
          code: p.code,
          name: p.name,
          level: 'province',
          score: this.calculateScore(keyword, p.name, 'province'),
          full_path: p.name
        });
      }
    }

    // Search regencies
    if (levels.includes('regency')) {
      let query = `
        SELECT r.code, r.name, r.province_code, p.name as province_name
        FROM regencies r
        LEFT JOIN provinces p ON r.province_code = p.code
        WHERE r.name LIKE ? ${activeFilterWithPrefix}
      `;
      const params: any[] = [`%${keyword}%`];

      if (parentCode && parentCode.length === 2) {
        query += ' AND r.province_code = ?';
        params.push(parentCode);
      }

      query += ' LIMIT ?';
      params.push(searchLimit);

      const regencies = await this.db.raw(query, params);

      for (const r of regencies) {
        results.push({
          code: r.code,
          name: r.name,
          level: 'regency',
          score: this.calculateScore(keyword, r.name, 'regency'),
          parent_info: {
            province_code: r.province_code,
            province_name: r.province_name
          },
          full_path: `${r.name}, ${r.province_name}`
        });
      }
    }

    // Search districts
    if (levels.includes('district')) {
      const districtFilter = includeInactive ? '' : 'AND d.is_active = 1';
      let query = `
        SELECT d.code, d.name, d.regency_code, r.name as regency_name, r.province_code, p.name as province_name
        FROM districts d
        LEFT JOIN regencies r ON d.regency_code = r.code
        LEFT JOIN provinces p ON r.province_code = p.code
        WHERE d.name LIKE ? ${districtFilter}
      `;
      const params: any[] = [`%${keyword}%`];

      if (parentCode && parentCode.length === 4) {
        query += ' AND d.regency_code = ?';
        params.push(parentCode);
      }

      query += ' LIMIT ?';
      params.push(searchLimit);

      const districts = await this.db.raw(query, params);

      for (const d of districts) {
        results.push({
          code: d.code,
          name: d.name,
          level: 'district',
          score: this.calculateScore(keyword, d.name, 'district'),
          parent_info: {
            regency_code: d.regency_code,
            regency_name: d.regency_name,
            province_code: d.province_code,
            province_name: d.province_name
          },
          full_path: `${d.name}, ${d.regency_name}, ${d.province_name}`
        });
      }
    }

    // Search villages
    if (levels.includes('village')) {
      const villageFilter = includeInactive ? '' : 'AND v.is_active = 1';
      let query = `
        SELECT v.code, v.name, v.district_code, d.name as district_name, 
               d.regency_code, r.name as regency_name, r.province_code, p.name as province_name
        FROM villages v
        LEFT JOIN districts d ON v.district_code = d.code
        LEFT JOIN regencies r ON d.regency_code = r.code
        LEFT JOIN provinces p ON r.province_code = p.code
        WHERE v.name LIKE ? ${villageFilter}
      `;
      const params: any[] = [`%${keyword}%`];

      if (parentCode && parentCode.length === 7) {
        query += ' AND v.district_code = ?';
        params.push(parentCode);
      }

      query += ' LIMIT ?';
      params.push(searchLimit);

      const villages = await this.db.raw(query, params);

      for (const v of villages) {
        results.push({
          code: v.code,
          name: v.name,
          level: 'village',
          score: this.calculateScore(keyword, v.name, 'village'),
          parent_info: {
            district_code: v.district_code,
            district_name: v.district_name,
            regency_code: v.regency_code,
            regency_name: v.regency_name,
            province_code: v.province_code,
            province_name: v.province_name
          },
          full_path: `${v.name}, ${v.district_name}, ${v.regency_name}, ${v.province_name}`
        });
      }
    }

    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async searchExact(keyword: string, levels?: Array<'province' | 'regency' | 'district' | 'village'>): Promise<SearchResult[]> {
    return this.search(keyword, { exactMatch: true, levels });
  }

  async searchByCode(code: string): Promise<SearchResult | null> {
    const results = await this.search(code, { exactMatch: true });
    return results.length > 0 ? results[0] : null;
  }

  async autocomplete(keyword: string, limit: number = 10): Promise<Array<{ code: string; name: string; label: string }>> {
    const results: Array<{ code: string; name: string; label: string }> = [];

    // Search villages (most specific)
    const villages = await this.db('villages')
      .where('name', 'like', `${keyword}%`)
      .where('is_active', true)
      .limit(limit);

    for (const v of villages) {
      const district = await this.db('districts').where('code', v.district_code).first();
      const regency = district ? await this.db('regencies').where('code', district.regency_code).first() : null;

      results.push({
        code: v.code,
        name: v.name,
        label: `${v.name}, ${district?.name || ''}, ${regency?.name || ''}`
      });
    }

    if (results.length >= limit) return results.slice(0, limit);

    // Search districts
    const districts = await this.db('districts')
      .where('name', 'like', `${keyword}%`)
      .where('is_active', true)
      .limit(limit - results.length);

    for (const d of districts) {
      const regency = await this.db('regencies').where('code', d.regency_code).first();

      results.push({
        code: d.code,
        name: d.name,
        label: `${d.name}, ${regency?.name || ''}`
      });
    }

    if (results.length >= limit) return results.slice(0, limit);

    // Search regencies
    const regencies = await this.db('regencies')
      .where('name', 'like', `${keyword}%`)
      .where('is_active', true)
      .limit(limit - results.length);

    for (const r of regencies) {
      results.push({
        code: r.code,
        name: r.name,
        label: r.name
      });
    }

    return results.slice(0, limit);
  }

  private calculateScore(keyword: string, name: string, level: string): number {
    const lowerKeyword = keyword.toLowerCase();
    const lowerName = name.toLowerCase();

    let score = 0;

    // Exact match
    if (lowerName === lowerKeyword) {
      score += 100;
    }
    // Starts with keyword
    else if (lowerName.startsWith(lowerKeyword)) {
      score += 80;
    }
    // Contains keyword
    else if (lowerName.includes(lowerKeyword)) {
      score += 60;
    }

    // Level bonus (more specific = higher score)
    switch (level) {
      case 'village': score += 4; break;
      case 'district': score += 3; break;
      case 'regency': score += 2; break;
      case 'province': score += 1; break;
    }

    // Length penalty (shorter names are often more important)
    score -= Math.floor(name.length / 10);

    return score;
  }
}
