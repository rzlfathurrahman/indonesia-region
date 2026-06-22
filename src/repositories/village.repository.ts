import { Knex } from 'knex';
import { getDb } from '../core/database';
import { QueryBuilder } from '../core/query-builder';
import { Village, QueryOptions } from '../types';

export class VillageRepository {
  private db: Knex;
  private queryBuilder: QueryBuilder;

  constructor(db?: Knex) {
    this.db = db || getDb();
    this.queryBuilder = new QueryBuilder(this.db);
  }

  async findAll(options: QueryOptions & { district_code?: string } = {}): Promise<Village[]> {
    return this.queryBuilder.getVillages(options.district_code, {
      cache: true,
      cacheTtl: 300000,
      ...options
    }) as Promise<Village[]>;
  }

  async findByCode(code: string): Promise<Village | undefined> {
    return this.queryBuilder.getVillage(code, { cache: true }) as Promise<Village | undefined>;
  }

  async findByDistrict(districtCode: string): Promise<Village[]> {
    return this.queryBuilder.getVillages(districtCode, { cache: true }) as Promise<Village[]>;
  }

  async create(data: Omit<Village, 'created_at' | 'updated_at'>): Promise<Village> {
    await this.db('villages').insert({
      code: data.code,
      district_code: data.district_code,
      name: data.name,
      is_active: data.is_active,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    });

    this.queryBuilder.invalidateVillage(data.code, data.district_code);
    return (await this.findByCode(data.code))!;
  }

  async update(code: string, data: Partial<Omit<Village, 'code' | 'created_at'>>): Promise<Village | undefined> {
    const existing = await this.findByCode(code);
    if (!existing) return undefined;

    const updateData: Record<string, any> = { updated_at: this.db.fn.now() };

    if (data.district_code !== undefined) updateData.district_code = data.district_code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    await this.db('villages').where('code', code).update(updateData);

    this.queryBuilder.invalidateVillage(code, existing.district_code);
    return this.findByCode(code);
  }

  async softDelete(code: string): Promise<boolean> {
    const existing = await this.findByCode(code);
    const result = await this.db('villages')
      .where('code', code)
      .update({ is_active: false, updated_at: this.db.fn.now() });

    this.queryBuilder.invalidateVillage(code, existing?.district_code);
    return result > 0;
  }

  async count(): Promise<number> {
    const result = await this.db('villages').count('code as count').first();
    return Number(result?.count) || 0;
  }

  async countByDistrict(districtCode: string): Promise<number> {
    const result = await this.db('villages')
      .where('district_code', districtCode)
      .count('code as count')
      .first();
    return Number(result?.count) || 0;
  }

  async bulkInsert(data: Array<Omit<Village, 'created_at' | 'updated_at'>>): Promise<void> {
    const insertData = data.map(d => ({
      ...d,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    }));

    await this.db('villages').insert(insertData).onConflict('code').merge();
    this.queryBuilder.invalidateAll();
  }
}
