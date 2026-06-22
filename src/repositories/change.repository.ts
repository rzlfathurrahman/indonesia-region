import { getDb } from '../core/database';
import { RegionChange } from '../types';
import { Knex } from 'knex';

export class ChangeRepository {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async findAll(options: {
    old_code?: string;
    new_code?: string;
    change_type?: RegionChange['change_type'];
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<RegionChange[]> {
    let query = this.db('region_changes').where('1', '1');

    if (options.old_code) {
      query = query.where('old_code', options.old_code);
    }

    if (options.new_code) {
      query = query.where('new_code', options.new_code);
    }

    if (options.change_type) {
      query = query.where('change_type', options.change_type);
    }

    if (options.from_date) {
      query = query.where('effective_date', '>=', options.from_date);
    }

    if (options.to_date) {
      query = query.where('effective_date', '<=', options.to_date);
    }

    query = query.orderBy('effective_date', 'desc').orderBy('id', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
      if (options.offset) {
        query = query.offset(options.offset);
      }
    }

    return query as Promise<RegionChange[]>;
  }

  async findById(id: number): Promise<RegionChange | undefined> {
    return this.db('region_changes').where('id', id).first() as Promise<RegionChange | undefined>;
  }

  async findByOldCode(code: string): Promise<RegionChange[]> {
    return this.db('region_changes')
      .where('old_code', code)
      .orderBy('effective_date', 'desc') as Promise<RegionChange[]>;
  }

  async findByNewCode(code: string): Promise<RegionChange[]> {
    return this.db('region_changes')
      .where('new_code', code)
      .orderBy('effective_date', 'desc') as Promise<RegionChange[]>;
  }

  async findHistory(code: string): Promise<RegionChange[]> {
    return this.db('region_changes')
      .where(function () {
        this.where('old_code', code).orWhere('new_code', code);
      })
      .orderBy('effective_date', 'desc') as Promise<RegionChange[]>;
  }

  async create(data: Omit<RegionChange, 'id' | 'created_at'>): Promise<RegionChange> {
    const insertData = {
      change_type: data.change_type,
      old_code: data.old_code,
      new_code: data.new_code || null,
      old_parent_code: data.old_parent_code || null,
      new_parent_code: data.new_parent_code || null,
      old_name: data.old_name,
      new_name: data.new_name || null,
      effective_date: data.effective_date,
      reference_number: data.reference_number || null,
      description: data.description || null,
      created_at: this.db.fn.now()
    };

    const [id] = await this.db('region_changes').insert(insertData);

    return (await this.findById(id))!;
  }

  async count(): Promise<number> {
    const result = await this.db('region_changes').count('id as count').first();
    return Number(result?.count) || 0;
  }

  async getLatestChangeDate(): Promise<string | null> {
    const result = await this.db('region_changes').max('effective_date as latest').first();
    return result?.latest ? String(result.latest) : null;
  }

  async bulkInsert(data: Array<Omit<RegionChange, 'id' | 'created_at'>>): Promise<number> {
    const insertData = data.map(d => ({
      change_type: d.change_type,
      old_code: d.old_code,
      new_code: d.new_code || null,
      old_parent_code: d.old_parent_code || null,
      new_parent_code: d.new_parent_code || null,
      old_name: d.old_name,
      new_name: d.new_name || null,
      effective_date: d.effective_date,
      reference_number: d.reference_number || null,
      description: d.description || null,
      created_at: this.db.fn.now()
    }));

    return this.db('region_changes').insert(insertData);
  }
}
