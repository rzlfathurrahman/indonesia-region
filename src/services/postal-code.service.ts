import { Knex } from 'knex';

export interface PostalCode {
  code: string;
  village_code: string;
  village_name?: string;
  district_name?: string;
  regency_name?: string;
  province_name?: string;
}

export interface PostalCodeQueryOptions {
  village_code?: string;
  province_code?: string;
  search?: string;
  limit?: number;
}

export class PostalCodeService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || require('../core/database').getDb();
  }

  async initTable(): Promise<void> {
    const hasTable = await this.db.schema.hasTable('postal_codes');

    if (!hasTable) {
      await this.db.schema.createTable('postal_codes', (table) => {
        table.string('code', 10).primary();
        table.string('village_code', 10).notNullable().index();
        table.string('village_name', 255).notNullable();
        table.string('district_name', 255).notNullable();
        table.string('regency_name', 255).notNullable();
        table.string('province_name', 255).notNullable();
        table.timestamp('created_at').notNullable().defaultTo(this.db.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(this.db.fn.now());

        // Indexes
        table.index('village_name');
        table.index('district_name');
        table.index('regency_name');
      });
    }
  }

  async addPostalCode(code: string, villageCode: string, villageName: string, districtName: string, regencyName: string, provinceName: string): Promise<PostalCode> {
    await this.db('postal_codes').insert({
      code,
      village_code: villageCode,
      village_name: villageName,
      district_name: districtName,
      regency_name: regencyName,
      province_name: provinceName
    });

    return { code, village_code: villageCode, village_name: villageName, district_name: districtName, regency_name: regencyName, province_name: provinceName };
  }

  async bulkInsert(data: PostalCode[]): Promise<number> {
    const insertData = data.map(d => ({
      ...d,
      created_at: this.db.fn.now(),
      updated_at: this.db.fn.now()
    }));

    await this.db('postal_codes').insert(insertData).onConflict('code').merge();
    return data.length;
  }

  async findByCode(code: string): Promise<PostalCode | null> {
    const result = await this.db('postal_codes').where('code', code).first();
    return result || null;
  }

  async findByVillageCode(villageCode: string): Promise<PostalCode[]> {
    return this.db('postal_codes')
      .where('village_code', villageCode)
      .orderBy('code') as Promise<PostalCode[]>;
  }

  async findByProvince(provinceCode: string, options: PostalCodeQueryOptions = {}): Promise<PostalCode[]> {
    let query = this.db('postal_codes')
      .join('villages', 'postal_codes.village_code', 'villages.code')
      .join('districts', 'villages.district_code', 'districts.code')
      .join('regencies', 'districts.regency_code', 'regencies.code')
      .where('regencies.province_code', provinceCode);

    if (options.search) {
      query = query.where('postal_codes.village_name', 'like', `%${options.search}%`);
    }

    query = query.orderBy('postal_codes.code');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query.select('postal_codes.*');
  }

  async searchPostalCodes(keyword: string, limit: number = 20): Promise<PostalCode[]> {
    return this.db('postal_codes')
      .where(function () {
        this.where('code', 'like', `%${keyword}%`)
          .orWhere('village_name', 'like', `%${keyword}%`)
          .orWhere('district_name', 'like', `%${keyword}%`);
      })
      .orderBy('code')
      .limit(limit) as Promise<PostalCode[]>;
  }

  async getPostalCodesByVillage(villageCode: string): Promise<PostalCode[]> {
    return this.db('postal_codes')
      .where('village_code', villageCode)
      .orderBy('code') as Promise<PostalCode[]>;
  }

  async getAllPostalCodes(options: PostalCodeQueryOptions = {}): Promise<PostalCode[]> {
    let query = this.db('postal_codes');

    if (options.village_code) {
      query = query.where('village_code', options.village_code);
    }

    if (options.province_code) {
      query = query.join('villages', 'postal_codes.village_code', 'villages.code')
        .join('districts', 'villages.district_code', 'districts.code')
        .join('regencies', 'districts.regency_code', 'regencies.code')
        .where('regencies.province_code', options.province_code);
    }

    if (options.search) {
      query = query.where('village_name', 'like', `%${options.search}%`);
    }

    query = query.orderBy('code');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query as Promise<PostalCode[]>;
  }

  async count(): Promise<number> {
    const result = await this.db('postal_codes').count('code as count').first();
    return Number(result?.count) || 0;
  }

  async delete(code: string): Promise<boolean> {
    const result = await this.db('postal_codes').where('code', code).del();
    return result > 0;
  }

  async update(code: string, data: Partial<PostalCode>): Promise<boolean> {
    const result = await this.db('postal_codes')
      .where('code', code)
      .update({ ...data, updated_at: this.db.fn.now() });
    return result > 0;
  }
}
