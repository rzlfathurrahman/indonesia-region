import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface SoftDeleteOptions {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RestoreResult {
  success: boolean;
  restored: number;
  errors: string[];
}

export class SoftDeleteService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  // Province operations
  async softDeleteProvince(code: string, options: SoftDeleteOptions = {}): Promise<boolean> {
    const result = await this.db('provinces')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async restoreProvince(code: string): Promise<boolean> {
    const result = await this.db('provinces')
      .where('code', code)
      .update({ is_active: true, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async getDeletedProvinces(): Promise<any[]> {
    return this.db('provinces').where('is_active', false).orderBy('code');
  }

  async permanentDeleteProvince(code: string): Promise<boolean> {
    const result = await this.db('provinces').where('code', code).del();
    return result > 0;
  }

  // Regency operations
  async softDeleteRegency(code: string, options: SoftDeleteOptions = {}): Promise<boolean> {
    const result = await this.db('regencies')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async restoreRegency(code: string): Promise<boolean> {
    const result = await this.db('regencies')
      .where('code', code)
      .update({ is_active: true, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async getDeletedRegencies(): Promise<any[]> {
    return this.db('regencies').where('is_active', false).orderBy('code');
  }

  async permanentDeleteRegency(code: string): Promise<boolean> {
    const result = await this.db('regencies').where('code', code).del();
    return result > 0;
  }

  // District operations
  async softDeleteDistrict(code: string, options: SoftDeleteOptions = {}): Promise<boolean> {
    const result = await this.db('districts')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async restoreDistrict(code: string): Promise<boolean> {
    const result = await this.db('districts')
      .where('code', code)
      .update({ is_active: true, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async getDeletedDistricts(): Promise<any[]> {
    return this.db('districts').where('is_active', false).orderBy('code');
  }

  async permanentDeleteDistrict(code: string): Promise<boolean> {
    const result = await this.db('districts').where('code', code).del();
    return result > 0;
  }

  // Village operations
  async softDeleteVillage(code: string, options: SoftDeleteOptions = {}): Promise<boolean> {
    const result = await this.db('villages')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async restoreVillage(code: string): Promise<boolean> {
    const result = await this.db('villages')
      .where('code', code)
      .update({ is_active: true, updated_at: this.db.fn.now() });
    return result > 0;
  }

  async getDeletedVillages(): Promise<any[]> {
    return this.db('villages').where('is_active', false).orderBy('code');
  }

  async permanentDeleteVillage(code: string): Promise<boolean> {
    const result = await this.db('villages').where('code', code).del();
    return result > 0;
  }

  // Bulk operations
  async bulkSoftDelete(
    table: 'provinces' | 'regencies' | 'districts' | 'villages',
    codes: string[]
  ): Promise<RestoreResult> {
    const errors: string[] = [];
    let restored = 0;

    try {
      const batchSize = 100;
      for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);
        const result = await this.db(table)
          .whereIn('code', batch)
          .update({ is_active: false, updated_at: this.db.fn.now() });
        restored += result;
      }
      return { success: true, restored, errors };
    } catch (error: any) {
      errors.push(error.message);
      return { success: false, restored, errors };
    }
  }

  async bulkRestore(
    table: 'provinces' | 'regencies' | 'districts' | 'villages',
    codes: string[]
  ): Promise<RestoreResult> {
    const errors: string[] = [];
    let restored = 0;

    try {
      const batchSize = 100;
      for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);
        const result = await this.db(table)
          .whereIn('code', batch)
          .update({ is_active: true, updated_at: this.db.fn.now() });
        restored += result;
      }
      return { success: true, restored, errors };
    } catch (error: any) {
      errors.push(error.message);
      return { success: false, restored, errors };
    }
  }

  async restoreAll(
    table: 'provinces' | 'regencies' | 'districts' | 'villages'
  ): Promise<RestoreResult> {
    const errors: string[] = [];
    let restored = 0;

    try {
      const result = await this.db(table)
        .where('is_active', false)
        .update({ is_active: true, updated_at: this.db.fn.now() });
      restored = result;
      return { success: true, restored, errors };
    } catch (error: any) {
      errors.push(error.message);
      return { success: false, restored, errors };
    }
  }

  async getDeletedStats(): Promise<{
    provinces: number;
    regencies: number;
    districts: number;
    villages: number;
    total: number;
  }> {
    const [provinces, regencies, districts, villages] = await Promise.all([
      this.db('provinces').where('is_active', false).count('code as count').first(),
      this.db('regencies').where('is_active', false).count('code as count').first(),
      this.db('districts').where('is_active', false).count('code as count').first(),
      this.db('villages').where('is_active', false).count('code as count').first()
    ]);

    const p = Number(provinces?.count) || 0;
    const r = Number(regencies?.count) || 0;
    const d = Number(districts?.count) || 0;
    const v = Number(villages?.count) || 0;

    return {
      provinces: p,
      regencies: r,
      districts: d,
      villages: v,
      total: p + r + d + v
    };
  }
}
