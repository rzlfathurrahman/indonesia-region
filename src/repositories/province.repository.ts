import { Knex } from 'knex';
import { getDb } from '../core/database';
import { QueryBuilder } from '../core/query-builder';
import { Province, QueryOptions } from '../types';

export class ProvinceRepository {
  private db: Knex;
  private queryBuilder: QueryBuilder;

  constructor(db?: Knex) {
    this.db = db || getDb();
    this.queryBuilder = new QueryBuilder(this.db);
  }

  async findAll(options: QueryOptions = {}): Promise<Province[]> {
    return this.queryBuilder.getProvinces({
      cache: true,
      cacheTtl: 300000, // 5 minutes
      orderBy: 'code',
      ...options
    }) as Promise<Province[]>;
  }

  async findByCode(code: string): Promise<Province | undefined> {
    return this.queryBuilder.getProvince(code, { cache: true }) as Promise<Province | undefined>;
  }

  async findByName(name: string): Promise<Province | undefined> {
    const result = await this.db('provinces').where('name', name).first();
    return result as Province | undefined;
  }

  async create(data: Omit<Province, 'created_at' | 'updated_at'>): Promise<Province> {
    await this.db('provinces').insert({
      code: data.code,
      name: data.name,
      is_active: data.is_active,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    });

    this.queryBuilder.invalidateProvince(data.code);
    return (await this.findByCode(data.code))!;
  }

  async update(code: string, data: Partial<Omit<Province, 'code' | 'created_at'>>): Promise<Province | undefined> {
    const existing = await this.findByCode(code);
    if (!existing) return undefined;

    const updateData: Record<string, any> = { updated_at: this.db.fn.now() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    await this.db('provinces').where('code', code).update(updateData);

    this.queryBuilder.invalidateProvince(code);
    return this.findByCode(code);
  }

  async softDelete(code: string): Promise<boolean> {
    const result = await this.db('provinces')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });

    this.queryBuilder.invalidateProvince(code);
    return result > 0;
  }

  async count(): Promise<number> {
    const result = await this.db('provinces').count('code as count').first();
    return Number(result?.count) || 0;
  }

  async bulkInsert(data: Array<Omit<Province, 'created_at' | 'updated_at'>>): Promise<void> {
    const insertData = data.map(d => ({
      ...d,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    }));

    await this.db('provinces').insert(insertData).onConflict('code').merge();
    this.queryBuilder.invalidateAll();
  }
}
