import { Knex } from 'knex';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface Migration {
  name: string;
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
}

export interface MigrationRecord {
  id: number;
  name: string;
  batch: number;
  created_at: string;
}

export class MigrationService {
  private db: Knex;
  private migrationsDir: string;

  constructor(db?: Knex, migrationsDir?: string) {
    this.db = db || require('../core/database').getDb();
    this.migrationsDir = migrationsDir || join(process.cwd(), 'migrations');
  }

  async initTable(): Promise<void> {
    const hasTable = await this.db.schema.hasTable('migrations');

    if (!hasTable) {
      await this.db.schema.createTable('migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255).notNullable().unique();
        table.integer('batch').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(this.db.fn.now());
      });
    }
  }

  async run(migrations: Migration[]): Promise<{ executed: string[]; skipped: string[] }> {
    await this.initTable();

    const executed = await this.getExecuted();
    const executedSet = new Set(executed.map(m => m.name));

    const pending = migrations.filter(m => !executedSet.has(m.name));

    if (pending.length === 0) {
      return { executed: [], skipped: migrations.map(m => m.name) };
    }

    const batch = (await this.getLastBatch()) + 1;
    const executedNames: string[] = [];

    await this.db.transaction(async (trx) => {
      for (const migration of pending) {
        await migration.up(trx);
        await trx('migrations').insert({
          name: migration.name,
          batch,
          created_at: trx.fn.now()
        });
        executedNames.push(migration.name);
      }
    });

    return {
      executed: executedNames,
      skipped: migrations.filter(m => executedSet.has(m.name)).map(m => m.name)
    };
  }

  async rollback(steps: number = 1): Promise<{ rolledBack: string[] }> {
    await this.initTable();

    const lastBatch = await this.getLastBatch();
    const migrationsInBatch = await this.db('migrations')
      .where('batch', lastBatch)
      .orderBy('id', 'desc')
      .limit(steps);

    if (migrationsInBatch.length === 0) {
      return { rolledBack: [] };
    }

    const rolledBack: string[] = [];

    await this.db.transaction(async (trx) => {
      for (const migration of migrationsInBatch) {
        // Note: You need to provide the migration down function
        // This is a simplified version
        await trx('migrations').where('id', migration.id).del();
        rolledBack.push(migration.name);
      }
    });

    return { rolledBack };
  }

  async reset(): Promise<{ rolledBack: string[] }> {
    await this.initTable();

    const allMigrations = await this.db('migrations')
      .orderBy('id', 'desc');

    const rolledBack: string[] = [];

    await this.db.transaction(async (trx) => {
      for (const migration of allMigrations) {
        await trx('migrations').where('id', migration.id).del();
        rolledBack.push(migration.name);
      }
    });

    return { rolledBack };
  }

  async getExecuted(): Promise<MigrationRecord[]> {
    await this.initTable();
    return this.db('migrations').orderBy('id') as Promise<MigrationRecord[]>;
  }

  async getPending(migrations: Migration[]): Promise<Migration[]> {
    const executed = await this.getExecuted();
    const executedSet = new Set(executed.map(m => m.name));
    return migrations.filter(m => !executedSet.has(m.name));
  }

  async getLastBatch(): Promise<number> {
    const result = await this.db('migrations').max('batch as lastBatch').first();
    return Number(result?.lastBatch) || 0;
  }

  async getStatus(migrations: Migration[]): Promise<{
    executed: string[];
    pending: string[];
    lastBatch: number;
  }> {
    const executed = await this.getExecuted();
    const pending = await this.getPending(migrations);
    const lastBatch = await this.getLastBatch();

    return {
      executed: executed.map(m => m.name),
      pending: pending.map(m => m.name),
      lastBatch
    };
  }

  async createMigrationFile(name: string): Promise<string> {
    if (!existsSync(this.migrationsDir)) {
      mkdirSync(this.migrationsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}_${name}.ts`;
    const filepath = join(this.migrationsDir, filename);

    const content = `
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add your migration here
}

export async function down(knex: Knex): Promise<void> {
  // Reverse your migration here
}
`;

    writeFileSync(filepath, content.trim());
    return filepath;
  }

  async loadMigrationsFromDir(): Promise<Migration[]> {
    if (!existsSync(this.migrationsDir)) {
      return [];
    }

    const fs = require('fs');
    const files = fs.readdirSync(this.migrationsDir)
      .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
      const filepath = join(this.migrationsDir, file);
      const migration = require(filepath);
      migrations.push({
        name: file.replace(/\.(ts|js)$/, ''),
        up: migration.up,
        down: migration.down
      });
    }

    return migrations;
  }
}
