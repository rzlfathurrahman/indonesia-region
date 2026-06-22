import fs from 'fs';
import path from 'path';
import { getDb, closeDb } from '../core/database';
import { parseCsv, ensureDataDir, getCsvDataDir } from '../utils/csv';
import { ChangeRepository } from '../repositories';
import {
  Province,
  Regency,
  District,
  Village,
  RegionChange,
  RegionLevel,
  SyncResult
} from '../types';
import { Knex } from 'knex';

export interface SyncOptions {
  csvDir?: string;
  dryRun?: boolean;
}

export class SyncService {
  private db: Knex;
  private changeRepo: ChangeRepository;

  constructor(db?: Knex) {
    this.db = db || getDb();
    this.changeRepo = new ChangeRepository(this.db);
  }

  async syncFromCsv(options: SyncOptions = {}): Promise<SyncResult[]> {
    const csvDir = options.csvDir || getCsvDataDir();
    ensureDataDir();

    const results: SyncResult[] = [];

    results.push(await this.syncProvinces(csvDir, options.dryRun));
    results.push(await this.syncRegencies(csvDir, options.dryRun));
    results.push(await this.syncDistricts(csvDir, options.dryRun));
    results.push(await this.syncVillages(csvDir, options.dryRun));

    return results;
  }

  private async syncProvinces(csvDir: string, dryRun?: boolean): Promise<SyncResult> {
    const csvPath = path.join(csvDir, 'provinces.csv');
    if (!fs.existsSync(csvPath)) {
      return { level: 'province', added: 0, updated: 0, deactivated: 0, changes: [] };
    }

    const csvData = parseCsv(fs.readFileSync(csvPath, 'utf-8'));
    const existing = await this.db('provinces').select('code');
    const existingMap = new Map(existing.map(e => [e.code, true]));

    let added = 0;
    let updated = 0;
    let deactivated = 0;
    const changes: RegionChange[] = [];

    for (const row of csvData) {
      const code = row.id || row.code;
      const name = row.name;

      if (dryRun) {
        if (!existingMap.has(code)) {
          added++;
        } else {
          updated++;
        }
        continue;
      }

      const existingProvince = await this.db('provinces').where('code', code).first();

      if (!existingProvince) {
        await this.db('provinces').insert({
          code,
          name,
          is_active: true,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        });
        added++;
      } else if (existingProvince.name !== name || !existingProvince.is_active) {
        await this.db('provinces')
          .where('code', code)
          .update({
            name,
            is_active: true,
            updated_at: this.db.fn.now()
          });
        updated++;
      }

      existingMap.delete(code);
    }

    // Deactivate provinces not in CSV
    for (const code of existingMap.keys()) {
      if (dryRun) {
        deactivated++;
        continue;
      }

      await this.db('provinces')
        .where('code', code)
        .update({ is_active: false, updated_at: this.db.fn.now() });
      deactivated++;
    }

    return { level: 'province', added, updated, deactivated, changes };
  }

  private async syncRegencies(csvDir: string, dryRun?: boolean): Promise<SyncResult> {
    const csvPath = path.join(csvDir, 'regencies.csv');
    if (!fs.existsSync(csvPath)) {
      return { level: 'regency', added: 0, updated: 0, deactivated: 0, changes: [] };
    }

    const csvData = parseCsv(fs.readFileSync(csvPath, 'utf-8'));
    const existing = await this.db('regencies').select('code');
    const existingMap = new Map(existing.map(e => [e.code, true]));

    let added = 0;
    let updated = 0;
    let deactivated = 0;
    const changes: RegionChange[] = [];

    for (const row of csvData) {
      const code = row.id || row.code;
      const provinceCode = row.province_id || row.province_code;
      const name = row.name;

      if (dryRun) {
        if (!existingMap.has(code)) {
          added++;
        } else {
          updated++;
        }
        continue;
      }

      const existingRegency = await this.db('regencies').where('code', code).first();

      if (!existingRegency) {
        await this.db('regencies').insert({
          code,
          province_code: provinceCode,
          name,
          is_active: true,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        });
        added++;
      } else if (existingRegency.name !== name || existingRegency.province_code !== provinceCode || !existingRegency.is_active) {
        // Track parent change (transfer)
        if (existingRegency.province_code !== provinceCode) {
          const change = await this.changeRepo.create({
            change_type: 'TRANSFER',
            old_code: code,
            new_code: code,
            old_parent_code: existingRegency.province_code,
            new_parent_code: provinceCode,
            old_name: existingRegency.name,
            new_name: name,
            effective_date: new Date().toISOString().split('T')[0],
            description: `Regency transferred from province ${existingRegency.province_code} to ${provinceCode}`
          });
          changes.push(change);
        }

        await this.db('regencies')
          .where('code', code)
          .update({
            province_code: provinceCode,
            name,
            is_active: true,
            updated_at: this.db.fn.now()
          });
        updated++;
      }

      existingMap.delete(code);
    }

    // Deactivate regencies not in CSV
    for (const code of existingMap.keys()) {
      if (dryRun) {
        deactivated++;
        continue;
      }

      await this.db('regencies')
        .where('code', code)
        .update({ is_active: false, updated_at: this.db.fn.now() });
      deactivated++;
    }

    return { level: 'regency', added, updated, deactivated, changes };
  }

  private async syncDistricts(csvDir: string, dryRun?: boolean): Promise<SyncResult> {
    const csvPath = path.join(csvDir, 'districts.csv');
    if (!fs.existsSync(csvPath)) {
      return { level: 'district', added: 0, updated: 0, deactivated: 0, changes: [] };
    }

    const csvData = parseCsv(fs.readFileSync(csvPath, 'utf-8'));
    const existing = await this.db('districts').select('code');
    const existingMap = new Map(existing.map(e => [e.code, true]));

    let added = 0;
    let updated = 0;
    let deactivated = 0;
    const changes: RegionChange[] = [];

    for (const row of csvData) {
      const code = row.id || row.code;
      const regencyCode = row.regency_id || row.regency_code;
      const name = row.name;

      if (dryRun) {
        if (!existingMap.has(code)) {
          added++;
        } else {
          updated++;
        }
        continue;
      }

      const existingDistrict = await this.db('districts').where('code', code).first();

      if (!existingDistrict) {
        await this.db('districts').insert({
          code,
          regency_code: regencyCode,
          name,
          is_active: true,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        });
        added++;
      } else if (existingDistrict.name !== name || existingDistrict.regency_code !== regencyCode || !existingDistrict.is_active) {
        // Track parent change (transfer)
        if (existingDistrict.regency_code !== regencyCode) {
          const change = await this.changeRepo.create({
            change_type: 'TRANSFER',
            old_code: code,
            new_code: code,
            old_parent_code: existingDistrict.regency_code,
            new_parent_code: regencyCode,
            old_name: existingDistrict.name,
            new_name: name,
            effective_date: new Date().toISOString().split('T')[0],
            description: `District transferred from regency ${existingDistrict.regency_code} to ${regencyCode}`
          });
          changes.push(change);
        }

        await this.db('districts')
          .where('code', code)
          .update({
            regency_code: regencyCode,
            name,
            is_active: true,
            updated_at: this.db.fn.now()
          });
        updated++;
      }

      existingMap.delete(code);
    }

    // Deactivate districts not in CSV
    for (const code of existingMap.keys()) {
      if (dryRun) {
        deactivated++;
        continue;
      }

      await this.db('districts')
        .where('code', code)
        .update({ is_active: false, updated_at: this.db.fn.now() });
      deactivated++;
    }

    return { level: 'district', added, updated, deactivated, changes };
  }

  private async syncVillages(csvDir: string, dryRun?: boolean): Promise<SyncResult> {
    const csvPath = path.join(csvDir, 'villages.csv');
    if (!fs.existsSync(csvPath)) {
      return { level: 'village', added: 0, updated: 0, deactivated: 0, changes: [] };
    }

    const csvData = parseCsv(fs.readFileSync(csvPath, 'utf-8'));
    const existing = await this.db('villages').select('code');
    const existingMap = new Map(existing.map(e => [e.code, true]));

    let added = 0;
    let updated = 0;
    let deactivated = 0;
    const changes: RegionChange[] = [];

    for (const row of csvData) {
      const code = row.id || row.code;
      const districtCode = row.district_id || row.district_code;
      const name = row.name;

      if (dryRun) {
        if (!existingMap.has(code)) {
          added++;
        } else {
          updated++;
        }
        continue;
      }

      const existingVillage = await this.db('villages').where('code', code).first();

      if (!existingVillage) {
        await this.db('villages').insert({
          code,
          district_code: districtCode,
          name,
          is_active: true,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        });
        added++;
      } else if (existingVillage.name !== name || existingVillage.district_code !== districtCode || !existingVillage.is_active) {
        // Track parent change (transfer)
        if (existingVillage.district_code !== districtCode) {
          const change = await this.changeRepo.create({
            change_type: 'TRANSFER',
            old_code: code,
            new_code: code,
            old_parent_code: existingVillage.district_code,
            new_parent_code: districtCode,
            old_name: existingVillage.name,
            new_name: name,
            effective_date: new Date().toISOString().split('T')[0],
            description: `Village transferred from district ${existingVillage.district_code} to ${districtCode}`
          });
          changes.push(change);
        }

        await this.db('villages')
          .where('code', code)
          .update({
            district_code: districtCode,
            name,
            is_active: true,
            updated_at: this.db.fn.now()
          });
        updated++;
      }

      existingMap.delete(code);
    }

    // Deactivate villages not in CSV
    for (const code of existingMap.keys()) {
      if (dryRun) {
        deactivated++;
        continue;
      }

      await this.db('villages')
        .where('code', code)
        .update({ is_active: false, updated_at: this.db.fn.now() });
      deactivated++;
    }

    return { level: 'village', added, updated, deactivated, changes };
  }

  async recordChange(data: Omit<RegionChange, 'id' | 'created_at'>): Promise<RegionChange> {
    return this.changeRepo.create(data);
  }

  async getChanges(options: {
    old_code?: string;
    new_code?: string;
    change_type?: RegionChange['change_type'];
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<RegionChange[]> {
    return this.changeRepo.findAll(options);
  }

  async getHistory(code: string): Promise<RegionChange[]> {
    return this.changeRepo.findHistory(code);
  }
}
