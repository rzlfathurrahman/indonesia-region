import { Knex } from 'knex';
import { getDb } from '../core/database';
import { parseCsv } from '../utils/csv';
import fs from 'fs';
import path from 'path';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  message: string;
  data?: any;
}

export interface ImportOptions {
  format: 'csv' | 'json';
  onConflict?: 'ignore' | 'merge' | 'error';
  validate?: boolean;
  dryRun?: boolean;
}

export class ImportService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async importProvinces(filePath: string, options: ImportOptions = { format: 'csv' }): Promise<ImportResult> {
    const data = await this.readFile(filePath, options.format);
    return this.importData('provinces', data, options, ['code', 'name']);
  }

  async importRegencies(filePath: string, options: ImportOptions = { format: 'csv' }): Promise<ImportResult> {
    const data = await this.readFile(filePath, options.format);
    return this.importData('regencies', data, options, ['code', 'province_code', 'name']);
  }

  async importDistricts(filePath: string, options: ImportOptions = { format: 'csv' }): Promise<ImportResult> {
    const data = await this.readFile(filePath, options.format);
    return this.importData('districts', data, options, ['code', 'regency_code', 'name']);
  }

  async importVillages(filePath: string, options: ImportOptions = { format: 'csv' }): Promise<ImportResult> {
    const data = await this.readFile(filePath, options.format);
    return this.importData('villages', data, options, ['code', 'district_code', 'name']);
  }

  async importFromJsonString(
    tableName: 'provinces' | 'regencies' | 'districts' | 'villages',
    jsonString: string,
    options: ImportOptions = { format: 'json' }
  ): Promise<ImportResult> {
    const data = JSON.parse(jsonString);
    const requiredFields = this.getRequiredFields(tableName);
    return this.importData(tableName, data, options, requiredFields);
  }

  async importFromArray(
    tableName: 'provinces' | 'regencies' | 'districts' | 'villages',
    data: Record<string, any>[],
    options: ImportOptions = { format: 'json' }
  ): Promise<ImportResult> {
    const requiredFields = this.getRequiredFields(tableName);
    return this.importData(tableName, data, options, requiredFields);
  }

  private async readFile(filePath: string, format: string): Promise<Record<string, any>[]> {
    const content = fs.readFileSync(filePath, 'utf-8');

    if (format === 'csv') {
      return parseCsv(content);
    } else {
      return JSON.parse(content);
    }
  }

  private async importData(
    tableName: string,
    data: Record<string, any>[],
    options: ImportOptions,
    requiredFields: string[]
  ): Promise<ImportResult> {
    const { onConflict = 'merge', validate = true, dryRun = false } = options;
    const errors: ImportError[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // Validate required fields
      if (validate) {
        for (const field of requiredFields) {
          if (!row[field] && row[field] !== 0) {
            errors.push({ row: rowNum, message: `Missing required field: ${field}`, data: row });
            skipped++;
            continue;
          }
        }
      }

      // Map CSV headers to DB columns if needed
      const mappedRow = this.mapRowToDb(tableName, row);

      if (dryRun) {
        imported++;
        continue;
      }

      try {
        if (onConflict === 'merge') {
          await this.db(tableName)
            .insert({ ...mappedRow, created_at: this.db.fn.now(), updated_at: this.db.fn.now() })
            .onConflict('code')
            .merge();
        } else if (onConflict === 'ignore') {
          await this.db(tableName)
            .insert({ ...mappedRow, created_at: this.db.fn.now(), updated_at: this.db.fn.now() })
            .onConflict('code')
            .ignore();
        } else {
          // Check if exists
          const existing = await this.db(tableName).where('code', mappedRow.code).first();
          if (existing) {
            errors.push({ row: rowNum, message: `Code ${mappedRow.code} already exists`, data: row });
            skipped++;
            continue;
          }
          await this.db(tableName).insert({ ...mappedRow, created_at: this.db.fn.now(), updated_at: this.db.fn.now() });
        }
        imported++;
      } catch (error: any) {
        errors.push({ row: rowNum, message: error.message, data: row });
        skipped++;
      }
    }

    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors
    };
  }

  private mapRowToDb(tableName: string, row: Record<string, any>): Record<string, any> {
    const mappings: Record<string, Record<string, string>> = {
      provinces: { id: 'code' },
      regencies: { id: 'code', province_id: 'province_code' },
      districts: { id: 'code', regency_id: 'regency_code' },
      villages: { id: 'code', district_id: 'district_code' }
    };

    const mapping = mappings[tableName] || {};
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      const dbKey = mapping[key] || key;
      result[dbKey] = value;
    }

    // Ensure is_active is boolean
    if (result.is_active !== undefined) {
      result.is_active = result.is_active === true || result.is_active === 1 || result.is_active === '1' || result.is_active === 'true';
    } else {
      result.is_active = true;
    }

    return result;
  }

  private getRequiredFields(tableName: string): string[] {
    switch (tableName) {
      case 'provinces':
        return ['code', 'name'];
      case 'regencies':
        return ['code', 'province_code', 'name'];
      case 'districts':
        return ['code', 'regency_code', 'name'];
      case 'villages':
        return ['code', 'district_code', 'name'];
      default:
        return [];
    }
  }

  async exportToCsv(
    tableName: 'provinces' | 'regencies' | 'districts' | 'villages',
    outputPath: string
  ): Promise<void> {
    const data = await this.db(tableName).select('*').orderBy('code');
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(outputPath, csv);
  }

  async exportToJson(
    tableName: 'provinces' | 'regencies' | 'districts' | 'villages',
    outputPath: string
  ): Promise<void> {
    const data = await this.db(tableName).select('*').orderBy('code');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  }
}
