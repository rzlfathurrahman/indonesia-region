import path from 'path';
import fs from 'fs';
import { getDb, closeDb, DatabaseConfig } from './core/database';
import { parseCsv, ensureDataDir, getCsvDataDir } from './utils/csv';
import { ProvinceRepository, RegencyRepository, DistrictRepository, VillageRepository } from './repositories';

const SEED_DATA_DIR = path.join(__dirname, '../data/csv');

function downloadCsvIfNotExists(): void {
  ensureDataDir();

  const files = ['provinces.csv', 'regencies.csv', 'districts.csv', 'villages.csv'];
  const baseUrl = 'https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/master/data/';

  files.forEach(file => {
    const filePath = path.join(SEED_DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} not found. Please download manually from:`);
      console.log(`   ${baseUrl}${file}`);
      console.log(`   Save to: ${SEED_DATA_DIR}/`);
    }
  });
}

async function seedData(dbConfig?: DatabaseConfig): Promise<void> {
  const db = getDb(dbConfig);
  const provinceRepo = new ProvinceRepository(db);
  const regencyRepo = new RegencyRepository(db);
  const districtRepo = new DistrictRepository(db);
  const villageRepo = new VillageRepository(db);

  console.log('🌱 Seeding database...');

  // Seed provinces
  const provincesPath = path.join(SEED_DATA_DIR, 'provinces.csv');
  if (fs.existsSync(provincesPath)) {
    const csvData = parseCsv(fs.readFileSync(provincesPath, 'utf-8'));
    const data = csvData.map(row => ({
      code: row.id || row.code,
      name: row.name,
      is_active: true
    }));
    await provinceRepo.bulkInsert(data);
    console.log(`✅ Seeded ${data.length} provinces`);
  }

  // Seed regencies
  const regenciesPath = path.join(SEED_DATA_DIR, 'regencies.csv');
  if (fs.existsSync(regenciesPath)) {
    const csvData = parseCsv(fs.readFileSync(regenciesPath, 'utf-8'));
    const data = csvData.map(row => ({
      code: row.id || row.code,
      province_code: row.province_id || row.province_code,
      name: row.name,
      is_active: true
    }));
    await regencyRepo.bulkInsert(data);
    console.log(`✅ Seeded ${data.length} regencies`);
  }

  // Seed districts
  const districtsPath = path.join(SEED_DATA_DIR, 'districts.csv');
  if (fs.existsSync(districtsPath)) {
    const csvData = parseCsv(fs.readFileSync(districtsPath, 'utf-8'));
    const data = csvData.map(row => ({
      code: row.id || row.code,
      regency_code: row.regency_id || row.regency_code,
      name: row.name,
      is_active: true
    }));
    await districtRepo.bulkInsert(data);
    console.log(`✅ Seeded ${data.length} districts`);
  }

  // Seed villages
  const villagesPath = path.join(SEED_DATA_DIR, 'villages.csv');
  if (fs.existsSync(villagesPath)) {
    const csvData = parseCsv(fs.readFileSync(villagesPath, 'utf-8'));
    const data = csvData.map(row => ({
      code: row.id || row.code,
      district_code: row.district_id || row.district_code,
      name: row.name,
      is_active: true
    }));
    await villageRepo.bulkInsert(data);
    console.log(`✅ Seeded ${data.length} villages`);
  }

  console.log('🎉 Seed completed!');
}

// Run
const config: DatabaseConfig = {
  client: (process.env.DB_CLIENT as any) || 'sqlite3',
  dbPath: process.env.DB_PATH
};

downloadCsvIfNotExists();
seedData(config)
  .then(() => closeDb())
  .catch(err => {
    console.error('Seed failed:', err);
    closeDb();
    process.exit(1);
  });
