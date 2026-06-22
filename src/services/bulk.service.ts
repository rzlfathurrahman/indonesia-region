import { Knex } from 'knex';
import { getDb } from '../core/database';
import { Province, Regency, District, Village } from '../types';

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  errors: BulkError[];
  data?: any[];
}

export interface BulkError {
  index: number;
  code?: string;
  message: string;
  data?: any;
}

export interface BulkInsertOptions {
  batchSize?: number;
  onConflict?: 'ignore' | 'merge' | 'error';
  validate?: boolean;
}

export class BulkService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  // Province bulk operations
  async bulkInsertProvinces(
    data: Array<Omit<Province, 'created_at' | 'updated_at'>>,
    options: BulkInsertOptions = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 1000, onConflict = 'merge' } = options;
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map(d => ({
          ...d,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        }));

        let query = this.db('provinces').insert(batch);

        if (onConflict === 'merge') {
          query = query.onConflict('code').merge();
        } else if (onConflict === 'ignore') {
          query = query.onConflict('code').ignore();
        }

        await query;
        processed += batch.length;
      }

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkUpdateProvinces(
    data: Array<{ code: string } & Partial<Omit<Province, 'code' | 'created_at'>>>,
    options: BulkInsertOptions = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 100 } = options;
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        await this.db.transaction(async (trx) => {
          for (const item of batch) {
            const { code, ...updateData } = item;
            updateData.updated_at = new Date().toISOString();

            await trx('provinces').where('code', code).update(updateData);
            processed++;
          }
        });
      }

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkSoftDeleteProvinces(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('provinces')
            .whereIn('code', batch)
            .update({ is_active: false, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkRestoreProvinces(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('provinces')
            .whereIn('code', batch)
            .update({ is_active: true, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  // Regency bulk operations
  async bulkInsertRegencies(
    data: Array<Omit<Regency, 'created_at' | 'updated_at'>>,
    options: BulkInsertOptions = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 1000, onConflict = 'merge' } = options;
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map(d => ({
          ...d,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        }));

        let query = this.db('regencies').insert(batch);

        if (onConflict === 'merge') {
          query = query.onConflict('code').merge();
        } else if (onConflict === 'ignore') {
          query = query.onConflict('code').ignore();
        }

        await query;
        processed += batch.length;
      }

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkSoftDeleteRegencies(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('regencies')
            .whereIn('code', batch)
            .update({ is_active: false, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkRestoreRegencies(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('regencies')
            .whereIn('code', batch)
            .update({ is_active: true, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  // District bulk operations
  async bulkInsertDistricts(
    data: Array<Omit<District, 'created_at' | 'updated_at'>>,
    options: BulkInsertOptions = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 1000, onConflict = 'merge' } = options;
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map(d => ({
          ...d,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        }));

        let query = this.db('districts').insert(batch);

        if (onConflict === 'merge') {
          query = query.onConflict('code').merge();
        } else if (onConflict === 'ignore') {
          query = query.onConflict('code').ignore();
        }

        await query;
        processed += batch.length;
      }

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkSoftDeleteDistricts(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('districts')
            .whereIn('code', batch)
            .update({ is_active: false, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkRestoreDistricts(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('districts')
            .whereIn('code', batch)
            .update({ is_active: true, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  // Village bulk operations
  async bulkInsertVillages(
    data: Array<Omit<Village, 'created_at' | 'updated_at'>>,
    options: BulkInsertOptions = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 1000, onConflict = 'merge' } = options;
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map(d => ({
          ...d,
          created_at: this.db.fn.now(),
          updated_at: this.db.fn.now()
        }));

        let query = this.db('villages').insert(batch);

        if (onConflict === 'merge') {
          query = query.onConflict('code').merge();
        } else if (onConflict === 'ignore') {
          query = query.onConflict('code').ignore();
        }

        await query;
        processed += batch.length;
      }

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkSoftDeleteVillages(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('villages')
            .whereIn('code', batch)
            .update({ is_active: false, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  async bulkRestoreVillages(codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          await trx('villages')
            .whereIn('code', batch)
            .update({ is_active: true, updated_at: trx.fn.now() });
          processed += batch.length;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }

  // Universal bulk delete (hard delete - use with caution!)
  async bulkHardDelete(table: 'provinces' | 'regencies' | 'districts' | 'villages', codes: string[]): Promise<BulkOperationResult> {
    const errors: BulkError[] = [];
    let processed = 0;

    try {
      await this.db.transaction(async (trx) => {
        const batchSize = 100;
        for (let i = 0; i < codes.length; i += batchSize) {
          const batch = codes.slice(i, i + batchSize);
          const deleted = await trx(table).whereIn('code', batch).del();
          processed += deleted;
        }
      });

      return { success: true, processed, errors };
    } catch (error: any) {
      errors.push({ index: -1, message: error.message });
      return { success: false, processed, errors };
    }
  }
}
