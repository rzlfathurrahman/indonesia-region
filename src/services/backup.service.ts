import { Knex } from 'knex';
import { createWriteStream, createReadStream, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export interface BackupOptions {
  compression?: boolean;
  includeAudit?: boolean;
  tables?: string[];
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  timestamp: string;
  compressed: boolean;
  tables: string[];
}

export class BackupService {
  private db: Knex;
  private backupDir: string;

  constructor(db?: Knex, backupDir?: string) {
    this.db = db || require('../core/database').getDb();
    this.backupDir = backupDir || join(process.cwd(), 'backups');
  }

  async init(): Promise<void> {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async backup(options: BackupOptions = {}): Promise<BackupInfo> {
    await this.init();

    const { compression = true, includeAudit = false, tables } = options;

    const allTables = ['provinces', 'regencies', 'districts', 'villages', 'region_changes'];
    if (includeAudit) {
      allTables.push('audit_logs');
    }

    const tablesToBackup = tables || allTables;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `wilayah_backup_${timestamp}.json${compression ? '.gz' : ''}`;
    const filepath = join(this.backupDir, filename);

    // Export all tables
    const backupData: Record<string, any[]> = {};

    for (const table of tablesToBackup) {
      const exists = await this.db.schema.hasTable(table);
      if (exists) {
        backupData[table] = await this.db(table).select('*');
      }
    }

    const jsonData = JSON.stringify(backupData, null, 2);

    if (compression) {
      await this.compressString(jsonData, filepath);
    } else {
      createWriteStream(filepath).write(jsonData);
    }

    const stats = statSync(filepath);

    return {
      filename,
      path: filepath,
      size: stats.size,
      timestamp,
      compressed: compression,
      tables: tablesToBackup
    };
  }

  async restore(backupPath: string, options: { dropExisting?: boolean } = {}): Promise<{ tables: string[]; rows: number }> {
    const { dropExisting = false } = options;

    let jsonData: string;

    if (backupPath.endsWith('.gz')) {
      jsonData = await this.decompressFile(backupPath);
    } else {
      jsonData = require('fs').readFileSync(backupPath, 'utf-8');
    }

    const backupData = JSON.parse(jsonData);
    const tables = Object.keys(backupData);

    let totalRows = 0;

    await this.db.transaction(async (trx) => {
      for (const table of tables) {
        const exists = await trx.schema.hasTable(table);
        if (!exists) continue;

        if (dropExisting) {
          await trx(table).del();
        }

        const data = backupData[table];
        if (data && data.length > 0) {
          // Batch insert
          const batchSize = 1000;
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await trx(table).insert(batch).onConflict('code').merge();
            totalRows += batch.length;
          }
        }
      }
    });

    return { tables, rows: totalRows };
  }

  async listBackups(): Promise<BackupInfo[]> {
    await this.init();

    const fs = require('fs');
    const files = fs.readdirSync(this.backupDir)
      .filter((f: string) => f.startsWith('wilayah_backup_'));

    return files.map((file: string) => {
      const filepath = join(this.backupDir, file);
      const stats = statSync(filepath);
      const timestamp = file.replace('wilayah_backup_', '').replace(/\.(json|json\.gz)$/, '');

      return {
        filename: file,
        path: filepath,
        size: stats.size,
        timestamp,
        compressed: file.endsWith('.gz'),
        tables: [] // Would need to parse to get tables
      };
    });
  }

  async deleteBackup(filename: string): Promise<boolean> {
    const filepath = join(this.backupDir, filename);
    if (!existsSync(filepath)) return false;

    require('fs').unlinkSync(filepath);
    return true;
  }

  private async compressString(data: string, outputPath: string): Promise<void> {
    const readable = Readable.from(data);
    const writeStream = createWriteStream(outputPath);

    await pipeline(readable, createGzip(), writeStream);
  }

  private async decompressFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let result = '';
      createReadStream(filePath)
        .pipe(createGunzip())
        .on('data', (chunk: Buffer) => { result += chunk.toString(); })
        .on('end', () => resolve(result))
        .on('error', reject);
    });
  }
}
