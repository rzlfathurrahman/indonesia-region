import { Knex } from 'knex';
import { getDb } from '../core/database';
import { Province, Regency, District, Village, RegionChange } from '../types';

export interface ExportOptions {
  format: 'json' | 'csv';
  includeInactive?: boolean;
  filter?: Record<string, any>;
}

export class ExportService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  // Province exports
  async exportProvinces(options: ExportOptions = { format: 'json' }): Promise<string | Province[]> {
    let query = this.db('provinces').select('*');

    if (!options.includeInactive) {
      query = query.where('is_active', true);
    }

    query = query.orderBy('code');

    const data = await query;

    if (options.format === 'csv') {
      return this.toCsv(data, ['code', 'name', 'is_active']);
    }

    return data;
  }

  // Regency exports
  async exportRegencies(options: ExportOptions = { format: 'json' }): Promise<string | Regency[]> {
    let query = this.db('regencies').select('*');

    if (!options.includeInactive) {
      query = query.where('is_active', true);
    }

    query = query.orderBy('code');

    const data = await query;

    if (options.format === 'csv') {
      return this.toCsv(data, ['code', 'province_code', 'name', 'is_active']);
    }

    return data;
  }

  // District exports
  async exportDistricts(options: ExportOptions = { format: 'json' }): Promise<string | District[]> {
    let query = this.db('districts').select('*');

    if (!options.includeInactive) {
      query = query.where('is_active', true);
    }

    query = query.orderBy('code');

    const data = await query;

    if (options.format === 'csv') {
      return this.toCsv(data, ['code', 'regency_code', 'name', 'is_active']);
    }

    return data;
  }

  // Village exports
  async exportVillages(options: ExportOptions = { format: 'json' }): Promise<string | Village[]> {
    let query = this.db('villages').select('*');

    if (!options.includeInactive) {
      query = query.where('is_active', true);
    }

    query = query.orderBy('code');

    const data = await query;

    if (options.format === 'csv') {
      return this.toCsv(data, ['code', 'district_code', 'name', 'is_active']);
    }

    return data;
  }

  // Change history exports
  async exportChanges(options: ExportOptions & { from_date?: string; to_date?: string } = { format: 'json' }): Promise<string | RegionChange[]> {
    let query = this.db('region_changes').select('*');

    if (options.from_date) {
      query = query.where('effective_date', '>=', options.from_date);
    }

    if (options.to_date) {
      query = query.where('effective_date', '<=', options.to_date);
    }

    query = query.orderBy('effective_date', 'desc');

    const data = await query;

    if (options.format === 'csv') {
      return this.toCsv(data, [
        'id', 'change_type', 'old_code', 'new_code',
        'old_parent_code', 'new_parent_code', 'old_name', 'new_name',
        'effective_date', 'reference_number', 'description'
      ]);
    }

    return data;
  }

  // Full hierarchy export (nested JSON)
  async exportHierarchy(): Promise<any> {
    const provinces = await this.db('provinces').where('is_active', true).orderBy('code');

    const result = [];
    for (const province of provinces) {
      const regencies = await this.db('regencies')
        .where('province_code', province.code)
        .where('is_active', true)
        .orderBy('code');

      const regencyData = [];
      for (const regency of regencies) {
        const districts = await this.db('districts')
          .where('regency_code', regency.code)
          .where('is_active', true)
          .orderBy('code');

        const districtData = [];
        for (const district of districts) {
          const villages = await this.db('villages')
            .where('district_code', district.code)
            .where('is_active', true)
            .orderBy('code');

          districtData.push({
            ...district,
            villages
          });
        }

        regencyData.push({
          ...regency,
          districts: districtData
        });
      }

      result.push({
        ...province,
        regencies: regencyData
      });
    }

    return result;
  }

  // Flat export with full path
  async exportFlat(): Promise<Array<Record<string, any>>> {
    const villages = await this.db('villages')
      .join('districts', 'villages.district_code', 'districts.code')
      .join('regencies', 'districts.regency_code', 'regencies.code')
      .join('provinces', 'regencies.province_code', 'provinces.code')
      .where('villages.is_active', true)
      .where('districts.is_active', true)
      .where('regencies.is_active', true)
      .where('provinces.is_active', true)
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
      .orderBy('villages.code');

    return villages.map(v => ({
      ...v,
      full_path: `${v.village_name}, ${v.district_name}, ${v.regency_name}, ${v.province_name}`
    }));
  }

  private toCsv(data: any[], columns: string[]): string {
    if (data.length === 0) return '';

    const header = columns.join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    return [header, ...rows].join('\n');
  }
}
