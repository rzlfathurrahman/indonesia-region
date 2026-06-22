import { Knex } from 'knex';
import { getDb } from '../core/database';
import { QueryBuilder } from '../core/query-builder';
import { Regency, QueryOptions } from '../types';

export class RegencyRepository {
  private db: Knex;
  private queryBuilder: QueryBuilder;

  constructor(db?: Knex) {
    this.db = db || getDb();
    this.queryBuilder = new QueryBuilder(this.db);
  }

  async findAll(options: QueryOptions & { province_code?: string } = {}): Promise<Regency[]> {
    return this.queryBuilder.getRegencies(options.province_code, {
      cache: true,
      cacheTtl: 300000,
      ...options
    }) as Promise<Regency[]>;
  }

  async findByCode(code: string): Promise<Regency | undefined> {
    return this.queryBuilder.getRegency(code, { cache: true }) as Promise<Regency | undefined>;
  }

  async findByProvince(provinceCode: string): Promise<Regency[]> {
    return this.queryBuilder.getRegencies(provinceCode, { cache: true }) as Promise<Regency[]>;
  }

  async create(data: Omit<Regency, 'created_at' | 'updated_at'>): Promise<Regency> {
    await this.db('regencies').insert({
      code: data.code,
      province_code: data.province_code,
      name: data.name,
      is_active: data.is_active,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    });

    this.queryBuilder.invalidateRegency(data.code, data.province_code);
    return (await this.findByCode(data.code))!;
  }

  async update(code: string, data: Partial<Omit<Regency, 'code' | 'created_at'>>): Promise<Regency | undefined> {
    const existing = await this.findByCode(code);
    if (!existing) return undefined;

    const updateData: Record<string, any> = { updated_at: this.db.fn.now() };

    if (data.province_code !== undefined) updateData.province_code = data.province_code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    await this.db('regencies').where('code', code).update(updateData);

    this.queryBuilder.invalidateRegency(code, existing.province_code);
    return this.findByCode(code);
  }

  async softDelete(code: string): Promise<boolean> {
    const existing = await this.findByCode(code);
    const result = await this.db('regencies')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });

    this.queryBuilder.invalidateRegency(code, existing?.province_code);
    return result > 0;
  }

  async count(): Promise<number> {
    const result = await this.db('regencies').count('code as count').first();
    return Number(result?.count) || 0;
  }

  async countByProvince(provinceCode: string): Promise<number> {
    const result = await this.db('regencies')
      .where('province_code', provinceCode)
      .count('code as count')
      .first();
    return Number(result?.count) || 0;
  }

  async bulkInsert(data: Array<Omit<Regency, 'created_at' | 'updated_at'>>): Promise<void> {
    const insertData = data.map(d => ({
      ...d,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    }));

    await this.db('regencies').insert(insertData).onConflict('code').merge();
    this.queryBuilder.invalidateAll();
  }
}
