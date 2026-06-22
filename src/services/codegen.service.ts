import { Knex } from 'knex';

export interface CodeGenOptions {
  outputDir?: string;
  interfacePrefix?: string;
  exportTypes?: boolean;
  includeComments?: boolean;
}

export class CodeGenService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || require('../core/database').getDb();
  }

  async generateTypes(options: CodeGenOptions = {}): Promise<string> {
    const { interfacePrefix = '', exportTypes = true, includeComments = true } = options;

    const tables = await this.getTables();
    let output = '';

    if (includeComments) {
      output += `// Auto-generated TypeScript types for Indonesia Wilayah\n`;
      output += `// Generated at: ${new Date().toISOString()}\n\n`;
    }

    const exportKeyword = exportTypes ? 'export ' : '';

    for (const table of tables) {
      const columns = await this.getColumns(table);

      if (includeComments) {
        output += `// Table: ${table}\n`;
      }

      const interfaceName = `${interfacePrefix}${this.toPascalCase(table)}`;

      output += `${exportKeyword}interface ${interfaceName} {\n`;

      for (const col of columns) {
        const tsType = this.mapDbTypeToTs(col.type, col.nullable);
        const optional = col.nullable ? '?' : '';

        if (includeComments) {
          output += `  /** ${col.type} ${col.nullable ? '(nullable)' : '(required)'} */\n`;
        }

        output += `  ${col.name}${optional}: ${tsType};\n`;
      }

      output += `}\n\n`;
    }

    // Generate type for all tables combined
    if (includeComments) {
      output += `// Combined types\n`;
    }

    output += `${exportKeyword}type TableName = ${tables.map(t => `'${t}'`).join(' | ')};\n\n`;

    output += `${exportKeyword}type TableType = {\n`;
    for (const table of tables) {
      const interfaceName = `${interfacePrefix}${this.toPascalCase(table)}`;
      output += `  ${table}: ${interfaceName};\n`;
    }
    output += `};\n\n`;

    return output;
  }

  async generateRepositoryTypes(options: CodeGenOptions = {}): Promise<string> {
    const tables = await this.getTables();
    let output = '';

    output += `// Auto-generated Repository Types\n`;
    output += `// Generated at: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      const columns = await this.getColumns(table);
      const interfaceName = this.toPascalCase(table);
      const primaryKey = columns.find(c => c.name === 'code')?.name || 'id';

      // Insert type (without timestamps)
      const insertColumns = columns.filter(c =>
        c.name !== 'created_at' && c.name !== 'updated_at'
      );

      output += `export type Create${interfaceName} = Omit<${interfaceName}, 'created_at' | 'updated_at'>;\n`;

      // Update type (without code and timestamps)
      const updateColumns = columns.filter(c =>
        c.name !== 'code' && c.name !== 'created_at' && c.name !== 'updated_at'
      );

      output += `export type Update${interfaceName} = Partial<Omit<${interfaceName}, 'code' | 'created_at' | 'updated_at'>>;\n\n`;
    }

    return output;
  }

  async generateEnums(): Promise<string> {
    let output = `// Auto-generated Enums\n`;
    output += `// Generated at: ${new Date().toISOString()}\n\n`;

    // Check for enum-like columns
    const changeTypes = ['SPLIT', 'MERGE', 'RENAME', 'TRANSFER'];

    output += `export type ChangeType = '${changeTypes.join("' | '")}';\n`;
    output += `export const ChangeTypes: ChangeType[] = ${JSON.stringify(changeTypes)};\n\n`;

    return output;
  }

  async generateFullTypes(options: CodeGenOptions = {}): Promise<string> {
    const types = await this.generateTypes(options);
    const repositoryTypes = await this.generateRepositoryTypes(options);
    const enums = await this.generateEnums();

    return `${types}\n${repositoryTypes}\n${enums}`;
  }

  async saveTypesToFile(filePath: string, options: CodeGenOptions = {}): Promise<void> {
    const fs = require('fs');
    const path = require('path');

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const types = await this.generateFullTypes(options);
    fs.writeFileSync(filePath, types);
  }

  private async getTables(): Promise<string[]> {
    const result = await this.db.raw(
      this.db.client.config.client === 'pg'
        ? "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        : "SELECT name FROM sqlite_master WHERE type='table'"
    );

    return result
      .map((r: any) => r.table_name || r.name)
      .filter((name: string) => !name.startsWith('knex_') && name !== 'migrations');
  }

  private async getColumns(table: string): Promise<Array<{ name: string; type: string; nullable: boolean }>> {
    const result = await this.db.raw(`PRAGMA table_info(${table})`);

    return result.map((col: any) => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0
    }));
  }

  private mapDbTypeToTs(dbType: string, nullable: boolean): string {
    const lowerType = dbType.toLowerCase();

    if (lowerType.includes('int')) {
      return nullable ? 'number | null' : 'number';
    }
    if (lowerType.includes('real') || lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal')) {
      return nullable ? 'number | null' : 'number';
    }
    if (lowerType.includes('bool')) {
      return nullable ? 'boolean | null' : 'boolean';
    }
    if (lowerType.includes('json')) {
      return nullable ? 'Record<string, any> | null' : 'Record<string, any>';
    }
    if (lowerType.includes('timestamp') || lowerType.includes('datetime') || lowerType.includes('date')) {
      return nullable ? 'string | null' : 'string';
    }
    if (lowerType.includes('text') || lowerType.includes('varchar') || lowerType.includes('char')) {
      return nullable ? 'string | null' : 'string';
    }

    return nullable ? 'any | null' : 'any';
  }

  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}
