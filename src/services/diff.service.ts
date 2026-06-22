import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface DiffResult {
  level: 'province' | 'regency' | 'district' | 'village';
  added: DiffItem[];
  removed: DiffItem[];
  modified: DiffModified[];
}

export interface DiffItem {
  code: string;
  name: string;
  parent_code?: string;
}

export interface DiffModified {
  code: string;
  old_name: string;
  new_name: string;
  parent_code?: string;
  parent_changed?: boolean;
  old_parent_code?: string;
  new_parent_code?: string;
}

export interface FullDiff {
  provinces: DiffResult;
  regencies: DiffResult;
  districts: DiffResult;
  villages: DiffResult;
  summary: {
    total_added: number;
    total_removed: number;
    total_modified: number;
  };
}

export class DiffService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async compareWithSource(sourceData: {
    provinces: Array<{ code: string; name: string }>;
    regencies: Array<{ code: string; province_code: string; name: string }>;
    districts: Array<{ code: string; regency_code: string; name: string }>;
    villages: Array<{ code: string; district_code: string; name: string }>;
  }): Promise<FullDiff> {
    const provinces = await this.diffLevel(
      'province',
      sourceData.provinces,
      'provinces',
      undefined
    );

    const regencies = await this.diffLevel(
      'regency',
      sourceData.regencies,
      'regencies',
      'province_code'
    );

    const districts = await this.diffLevel(
      'district',
      sourceData.districts,
      'districts',
      'regency_code'
    );

    const villages = await this.diffLevel(
      'village',
      sourceData.villages,
      'villages',
      'district_code'
    );

    return {
      provinces,
      regencies,
      districts,
      villages,
      summary: {
        total_added: provinces.added.length + regencies.added.length + districts.added.length + villages.added.length,
        total_removed: provinces.removed.length + regencies.removed.length + districts.removed.length + villages.removed.length,
        total_modified: provinces.modified.length + regencies.modified.length + districts.modified.length + villages.modified.length,
      }
    };
  }

  private async diffLevel(
    level: 'province' | 'regency' | 'district' | 'village',
    sourceData: Array<{ code: string; name: string; [key: string]: any }>,
    tableName: string,
    parentColumn: string | undefined
  ): Promise<DiffResult> {
    const existing = await this.db(tableName).select('*');
    const existingMap = new Map(existing.map(e => [e.code, e]));
    const sourceMap = new Map(sourceData.map(s => [s.code, s]));

    const added: DiffItem[] = [];
    const removed: DiffItem[] = [];
    const modified: DiffModified[] = [];

    // Find added and modified
    for (const source of sourceData) {
      const existingItem = existingMap.get(source.code);

      if (!existingItem) {
        added.push({
          code: source.code,
          name: source.name,
          parent_code: parentColumn ? source[parentColumn] : undefined
        });
      } else if (existingItem.name !== source.name) {
        const mod: DiffModified = {
          code: source.code,
          old_name: existingItem.name,
          new_name: source.name,
          parent_code: parentColumn ? source[parentColumn] : undefined
        };

        if (parentColumn && existingItem[parentColumn] !== source[parentColumn]) {
          mod.parent_changed = true;
          mod.old_parent_code = existingItem[parentColumn];
          mod.new_parent_code = source[parentColumn];
        }

        modified.push(mod);
      }
    }

    // Find removed
    for (const [code, existingItem] of existingMap) {
      if (!sourceMap.has(code)) {
        removed.push({
          code,
          name: existingItem.name,
          parent_code: parentColumn ? existingItem[parentColumn] : undefined
        });
      }
    }

    return { level, added, removed, modified };
  }

  generateReport(diff: FullDiff): string {
    const lines: string[] = [];

    lines.push('=== INDONESIA WILAYAH DIFF REPORT ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    lines.push(`SUMMARY:`);
    lines.push(`  Added: ${diff.summary.total_added}`);
    lines.push(`  Removed: ${diff.summary.total_removed}`);
    lines.push(`  Modified: ${diff.summary.total_modified}`);
    lines.push('');

    // Provinces
    if (diff.provinces.added.length > 0 || diff.provinces.removed.length > 0 || diff.provinces.modified.length > 0) {
      lines.push('--- PROVINCES ---');
      if (diff.provinces.added.length > 0) {
        lines.push('Added:');
        diff.provinces.added.forEach(a => lines.push(`  + ${a.code} ${a.name}`));
      }
      if (diff.provinces.removed.length > 0) {
        lines.push('Removed:');
        diff.provinces.removed.forEach(r => lines.push(`  - ${r.code} ${r.name}`));
      }
      if (diff.provinces.modified.length > 0) {
        lines.push('Modified:');
        diff.provinces.modified.forEach(m => lines.push(`  ~ ${m.code} ${m.old_name} → ${m.new_name}`));
      }
      lines.push('');
    }

    // Regencies
    if (diff.regencies.added.length > 0 || diff.regencies.removed.length > 0 || diff.regencies.modified.length > 0) {
      lines.push('--- REGENCIES ---');
      if (diff.regencies.added.length > 0) {
        lines.push('Added:');
        diff.regencies.added.forEach(a => lines.push(`  + ${a.code} ${a.name} (${a.parent_code})`));
      }
      if (diff.regencies.removed.length > 0) {
        lines.push('Removed:');
        diff.regencies.removed.forEach(r => lines.push(`  - ${r.code} ${r.name}`));
      }
      if (diff.regencies.modified.length > 0) {
        lines.push('Modified:');
        diff.regencies.modified.forEach(m => {
          let line = `  ~ ${m.code} ${m.old_name} → ${m.new_name}`;
          if (m.parent_changed) {
            line += ` [parent: ${m.old_parent_code} → ${m.new_parent_code}]`;
          }
          lines.push(line);
        });
      }
      lines.push('');
    }

    // Districts
    if (diff.districts.added.length > 0 || diff.districts.removed.length > 0 || diff.districts.modified.length > 0) {
      lines.push('--- DISTRICTS ---');
      if (diff.districts.added.length > 0) {
        lines.push('Added:');
        diff.districts.added.forEach(a => lines.push(`  + ${a.code} ${a.name} (${a.parent_code})`));
      }
      if (diff.districts.removed.length > 0) {
        lines.push('Removed:');
        diff.districts.removed.forEach(r => lines.push(`  - ${r.code} ${r.name}`));
      }
      if (diff.districts.modified.length > 0) {
        lines.push('Modified:');
        diff.districts.modified.forEach(m => {
          let line = `  ~ ${m.code} ${m.old_name} → ${m.new_name}`;
          if (m.parent_changed) {
            line += ` [parent: ${m.old_parent_code} → ${m.new_parent_code}]`;
          }
          lines.push(line);
        });
      }
      lines.push('');
    }

    // Villages
    if (diff.villages.added.length > 0 || diff.villages.removed.length > 0 || diff.villages.modified.length > 0) {
      lines.push('--- VILLAGES ---');
      if (diff.villages.added.length > 0) {
        lines.push('Added:');
        diff.villages.added.forEach(a => lines.push(`  + ${a.code} ${a.name} (${a.parent_code})`));
      }
      if (diff.villages.removed.length > 0) {
        lines.push('Removed:');
        diff.villages.removed.forEach(r => lines.push(`  - ${r.code} ${r.name}`));
      }
      if (diff.villages.modified.length > 0) {
        lines.push('Modified:');
        diff.villages.modified.forEach(m => {
          let line = `  ~ ${m.code} ${m.old_name} → ${m.new_name}`;
          if (m.parent_changed) {
            line += ` [parent: ${m.old_parent_code} → ${m.new_parent_code}]`;
          }
          lines.push(line);
        });
      }
    }

    return lines.join('\n');
  }
}
