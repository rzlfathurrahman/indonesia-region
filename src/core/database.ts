import knex, { Knex } from 'knex';
import path from 'path';

let db: Knex | null = null;
let dbConfig: DatabaseConfig | null = null;

export type DatabaseClient = 'sqlite3' | 'pg' | 'mysql2' | 'mysql';

export interface DatabaseConfig {
  client?: DatabaseClient;
  connection?: string | Knex.PgConnectionConfig | Knex.MySqlConnectionConfig;
  dbPath?: string;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
  enableCache?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
}

export function getDb(config?: DatabaseConfig): Knex {
  if (db) return db;

  const finalConfig = config || dbConfig || {};
  dbConfig = finalConfig;

  const { client = 'sqlite3', connection, dbPath, pool } = finalConfig;

  let knexConfig: Knex.Config;

  if (client === 'sqlite3') {
    const finalPath = dbPath || path.join(__dirname, '../../data/wilayah.db');
    knexConfig = {
      client: 'sqlite3',
      connection: { filename: finalPath },
      useNullAsDefault: true,
      pool: {
        min: 0,
        max: 1,
        ...pool
      }
    };
  } else if (client === 'pg') {
    knexConfig = {
      client: 'pg',
      connection: connection || process.env.DATABASE_URL,
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        ...pool
      }
    };
  } else if (client === 'mysql' || client === 'mysql2') {
    knexConfig = {
      client: 'mysql2',
      connection: connection || process.env.DATABASE_URL,
      pool: {
        min: 2,
        max: 10,
        ...pool
      }
    };
  } else {
    throw new Error(`Unsupported database client: ${client}`);
  }

  db = knex(knexConfig);

  return db;
}

export function closeDb(): void {
  if (db) {
    db.destroy();
    db = null;
  }
}

export function getDbInstance(): Knex | null {
  return db;
}

export function getConfig(): DatabaseConfig | null {
  return dbConfig;
}

export async function initSchema(database: Knex, client: DatabaseClient): Promise<void> {
  const hasProvinces = await database.schema.hasTable('provinces');

  if (!hasProvinces) {
    await database.schema.createTable('provinces', (table) => {
      table.string('code', 10).primary();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(database.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(database.fn.now());

      // Performance indexes
      table.index('name');
      table.index('is_active');
    });
  }

  const hasRegencies = await database.schema.hasTable('regencies');
  if (!hasRegencies) {
    await database.schema.createTable('regencies', (table) => {
      table.string('code', 10).primary();
      table.string('province_code', 10).notNullable();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(database.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(database.fn.now());

      // Performance indexes
      table.index('province_code');
      table.index('name');
      table.index('is_active');
      table.index(['province_code', 'is_active']);
    });
  }

  const hasDistricts = await database.schema.hasTable('districts');
  if (!hasDistricts) {
    await database.schema.createTable('districts', (table) => {
      table.string('code', 10).primary();
      table.string('regency_code', 10).notNullable();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(database.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(database.fn.now());

      // Performance indexes
      table.index('regency_code');
      table.index('name');
      table.index('is_active');
      table.index(['regency_code', 'is_active']);
    });
  }

  const hasVillages = await database.schema.hasTable('villages');
  if (!hasVillages) {
    await database.schema.createTable('villages', (table) => {
      table.string('code', 10).primary();
      table.string('district_code', 10).notNullable();
      table.string('name', 255).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(database.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(database.fn.now());

      // Performance indexes
      table.index('district_code');
      table.index('name');
      table.index('is_active');
      table.index(['district_code', 'is_active']);
    });
  }

  const hasChanges = await database.schema.hasTable('region_changes');
  if (!hasChanges) {
    await database.schema.createTable('region_changes', (table) => {
      table.increments('id').primary();
      table.enum('change_type', ['SPLIT', 'MERGE', 'RENAME', 'TRANSFER']).notNullable();
      table.string('old_code', 10).notNullable();
      table.string('new_code', 10).nullable();
      table.string('old_parent_code', 10).nullable();
      table.string('new_parent_code', 10).nullable();
      table.string('old_name', 255).notNullable();
      table.string('new_name', 255).nullable();
      table.date('effective_date').notNullable();
      table.string('reference_number', 255).nullable();
      table.text('description').nullable();
      table.timestamp('created_at').notNullable().defaultTo(database.fn.now());

      // Performance indexes
      table.index('old_code');
      table.index('new_code');
      table.index('effective_date');
      table.index('change_type');
      table.index(['old_code', 'effective_date']);
    });
  }
}
