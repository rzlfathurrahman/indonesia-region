import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface RegionStats {
  level: 'province' | 'regency' | 'district' | 'village';
  total: number;
  active: number;
  inactive: number;
  lastUpdated: string | null;
}

export interface ProvinceStats {
  code: string;
  name: string;
  regency_count: number;
  district_count: number;
  village_count: number;
  total_regions: number;
}

export interface FullStats {
  summary: {
    provinces: RegionStats;
    regencies: RegionStats;
    districts: RegionStats;
    villages: RegionStats;
    total: number;
  };
  topProvinces: ProvinceStats[];
  lastSync: string | null;
  lastChange: string | null;
}

export class StatisticsService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async getRegionStats(level: 'province' | 'regency' | 'district' | 'village'): Promise<RegionStats> {
    const table = `${level}s`;

    const totalResult = await this.db(table).count('code as count').first();
    const activeResult = await this.db(table).where('is_active', true).count('code as count').first();
    const inactiveResult = await this.db(table).where('is_active', false).count('code as count').first();
    const lastUpdatedResult = await this.db(table).max('updated_at as lastUpdated').first();

    return {
      level,
      total: Number(totalResult?.count) || 0,
      active: Number(activeResult?.count) || 0,
      inactive: Number(inactiveResult?.count) || 0,
      lastUpdated: lastUpdatedResult?.lastUpdated ? String(lastUpdatedResult.lastUpdated) : null
    };
  }

  async getProvinceStats(provinceCode: string): Promise<ProvinceStats | null> {
    const province = await this.db('provinces').where('code', provinceCode).first();
    if (!province) return null;

    const regencyCount = await this.db('regencies')
      .where('province_code', provinceCode)
      .where('is_active', true)
      .count('code as count')
      .first();

    const districtResult = await this.db('districts')
      .join('regencies', 'districts.regency_code', 'regencies.code')
      .where('regencies.province_code', provinceCode)
      .where('districts.is_active', true)
      .where('regencies.is_active', true)
      .count('districts.code as count')
      .first();

    const villageResult = await this.db('villages')
      .join('districts', 'villages.district_code', 'districts.code')
      .join('regencies', 'districts.regency_code', 'regencies.code')
      .where('regencies.province_code', provinceCode)
      .where('villages.is_active', true)
      .where('districts.is_active', true)
      .where('regencies.is_active', true)
      .count('villages.code as count')
      .first();

    const regencyCountNum = Number(regencyCount?.count) || 0;
    const districtCountNum = Number(districtResult?.count) || 0;
    const villageCountNum = Number(villageResult?.count) || 0;

    return {
      code: province.code,
      name: province.name,
      regency_count: regencyCountNum,
      district_count: districtCountNum,
      village_count: villageCountNum,
      total_regions: regencyCountNum + districtCountNum + villageCountNum
    };
  }

  async getAllProvinceStats(): Promise<ProvinceStats[]> {
    const provinces = await this.db('provinces').where('is_active', true).orderBy('code');
    const stats: ProvinceStats[] = [];

    for (const province of provinces) {
      const stat = await this.getProvinceStats(province.code);
      if (stat) stats.push(stat);
    }

    return stats;
  }

  async getTopProvincesByRegionCount(limit: number = 10): Promise<ProvinceStats[]> {
    const allStats = await this.getAllProvinceStats();
    return allStats
      .sort((a, b) => b.total_regions - a.total_regions)
      .slice(0, limit);
  }

  async getFullStats(): Promise<FullStats> {
    const [provinces, regencies, districts, villages] = await Promise.all([
      this.getRegionStats('province'),
      this.getRegionStats('regency'),
      this.getRegionStats('district'),
      this.getRegionStats('village')
    ]);

    const topProvinces = await this.getTopProvincesByRegionCount(10);

    const lastChangeResult = await this.db('region_changes')
      .max('effective_date as lastChange')
      .first();

    return {
      summary: {
        provinces,
        regencies,
        districts,
        villages,
        total: provinces.total + regencies.total + districts.total + villages.total
      },
      topProvinces,
      lastSync: provinces.lastUpdated,
      lastChange: lastChangeResult?.lastChange ? String(lastChangeResult.lastChange) : null
    };
  }

  async getChangeStats(fromDate?: string, toDate?: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byMonth: Array<{ month: string; count: number }>;
  }> {
    let query = this.db('region_changes');

    if (fromDate) {
      query = query.where('effective_date', '>=', fromDate);
    }
    if (toDate) {
      query = query.where('effective_date', '<=', toDate);
    }

    const totalResult = await query.clone().count('id as count').first();
    const total = Number(totalResult?.count) || 0;

    const byTypeResult = await query.clone()
      .select('change_type')
      .count('id as count')
      .groupBy('change_type');

    const byType: Record<string, number> = {};
    for (const row of byTypeResult) {
      byType[row.change_type] = Number(row.count);
    }

    // Get changes by month (last 12 months)
    const byMonthResult = await this.db('region_changes')
      .select(this.db.raw("strftime('%Y-%m', effective_date) as month"))
      .count('id as count')
      .where('effective_date', '>=', this.db.raw("date('now', '-12 months')"))
      .groupBy('month')
      .orderBy('month');

    const byMonth = byMonthResult.map(r => ({
      month: String(r.month),
      count: Number(r.count)
    }));

    return { total, byType, byMonth };
  }

  async getDistributionStats(): Promise<{
    avgDistrictsPerRegency: number;
    avgVillagesPerDistrict: number;
    maxDistrictsInRegency: { code: string; name: string; count: number } | null;
    maxVillagesInDistrict: { code: string; name: string; count: number } | null;
  }> {
    // Avg districts per regency
    const avgDistrictResult = await this.db('regencies')
      .where('is_active', true)
      .avg('(SELECT COUNT(*) FROM districts WHERE regency_code = regencies.code AND is_active = 1) as avg')
      .first();

    // Avg villages per district
    const avgVillageResult = await this.db('districts')
      .where('is_active', true)
      .avg('(SELECT COUNT(*) FROM villages WHERE district_code = districts.code AND is_active = 1) as avg')
      .first();

    // Max districts in a regency
    const maxDistrictResult = await this.db('regencies')
      .join(this.db.raw('(SELECT regency_code, COUNT(*) as cnt FROM districts WHERE is_active = 1 GROUP BY regency_code) as d'), 'regencies.code', 'd.regency_code')
      .select('regencies.code', 'regencies.name', 'd.cnt as count')
      .orderBy('d.cnt', 'desc')
      .first();

    // Max villages in a district
    const maxVillageResult = await this.db('districts')
      .join(this.db.raw('(SELECT district_code, COUNT(*) as cnt FROM villages WHERE is_active = 1 GROUP BY district_code) as v'), 'districts.code', 'v.district_code')
      .select('districts.code', 'districts.name', 'v.cnt as count')
      .orderBy('v.cnt', 'desc')
      .first();

    return {
      avgDistrictsPerRegency: Number(avgDistrictResult?.avg) || 0,
      avgVillagesPerDistrict: Number(avgVillageResult?.avg) || 0,
      maxDistrictsInRegency: maxDistrictResult ? {
        code: maxDistrictResult.code,
        name: maxDistrictResult.name,
        count: Number(maxDistrictResult.count)
      } : null,
      maxVillagesInDistrict: maxVillageResult ? {
        code: maxVillageResult.code,
        name: maxVillageResult.name,
        count: Number(maxVillageResult.count)
      } : null
    };
  }
}
