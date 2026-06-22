import { Knex } from 'knex';
import { getDb } from '../core/database';
import { QueryBuilder } from '../core/query-builder';
import { District, QueryOptions } from '../types';

export class DistrictRepository {
  private db: Knex;
  private queryBuilder: QueryBuilder;

  constructor(db?: Knex) {
    this.db = db || getDb();
    this.queryBuilder = new QueryBuilder(this.db);
  }

  async findAll(options: QueryOptions & { regency_code?: string } = {}): Promise<District[]> {
    return this.queryBuilder.getDistricts(options.regency_code, {
      cache: true,
      cacheTtl: 300000,
      ...options
    }) as Promise<District[]>;
  }

  async findByCode(code: string): Promise<District | undefined> {
    return this.queryBuilder.getDistrict(code, { cache: true }) as Promise<District | undefined>;
  }

  async findByRegency(regencyCode: string): Promise<District[]> {
    return this.queryBuilder.getDistricts(regencyCode, { cache: true }) as Promise<District[]>;
  }

  async create(data: Omit<District, 'created_at' | 'updated_at'>): Promise<District> {
    await this.db('districts').insert({
      code: data.code,
      regency_code: data.regency_code,
      name: data.name,
      is_active: data.is_active,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    });

    this.queryBuilder.invalidateDistrict(data.code, data.regency_code);
    return (await this.findByCode(data.code))!;
  }

  async update(code: string, data: Partial<Omit<District, 'code' | 'created_at'>>): Promise<District | undefined> {
    const existing = await this.findByCode(code);
    if (!existing) return undefined;

    const updateData: Record<string, any> = { updated_at: this.db.fn.now() };

    if (data.regency_code !== undefined) updateData.regency_code = data.regency_code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    await this.db('districts').where('code', code).update(updateData);

    this.queryBuilder.invalidateDistrict(code, existing.regency_code);
    return this.findByCode(code);
  }

  async softDelete(code: string): Promise<boolean> {
    const existing = await this.findByCode(code);
    const result = await this.db('districts')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });

    this.queryBuilder.invalidateDistrict(code, existing?.regency_code);
    return result > 0;
  }

  async count(): Promise<number> {
    const result = await this.db('districts').count('code as count').first();
    return Number(result?.count) || 0;
  }

  async countByRegency(regencyCode: string): Promise<number> {
    const result = await this.db('districts')
      .where('regency_code', regencyCode)
      .count('code as count')
      .first();
    return Number(result?.count) || 0;
  }

  async bulkInsert(data: Array<Omit<District, 'created_at' | 'updated_at'>>): Promise<void> {
    const insertData = data.map(d => ({
      ...d,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    }));

    await this.db('districts').insert(insertData).onConflict('code').merge();
    this.queryBuilder.invalidateAll();
  }
}
