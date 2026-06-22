import fs from 'fs';
import path from 'path';

export interface CsvRow {
  [key: string]: string;
}

export function readCsvFile(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseCsv(content);
}

export function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row: CsvRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

export function getCsvDataDir(): string {
  return path.join(__dirname, '../../data/csv');
}

export function ensureDataDir(): void {
  const dirs = [
    getCsvDataDir(),
    path.join(__dirname, '../../data'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
