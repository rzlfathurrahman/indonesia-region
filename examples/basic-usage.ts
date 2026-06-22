import {
  initialize,
  createProvinceRepo,
  createRegencyRepo,
  createDistrictRepo,
  createVillageRepo,
  createSyncService,
  closeDb
} from '../src';

async function main() {
  console.log('🇮🇩 Indonesia Wilayah Library - Usage Example\n');

  // Initialize with SQLite (default)
  const db = initialize({ client: 'sqlite3' });

  // Or initialize with PostgreSQL:
  // const db = initialize({ client: 'pg', connection: 'postgres://user:pass@localhost:5432/wilayah' });

  // Or initialize with MySQL:
  // const db = initialize({ client: 'mysql2', connection: { host: 'localhost', user: 'root', password: '', database: 'wilayah' } });

  // Initialize repositories with the db instance
  const provinceRepo = createProvinceRepo(db);
  const regencyRepo = createRegencyRepo(db);
  const districtRepo = createDistrictRepo(db);
  const villageRepo = createVillageRepo(db);
  const syncService = createSyncService(db);

  try {
    // 1. Get all provinces
    console.log('📋 Daftar Provinsi:');
    const provinces = await provinceRepo.findAll({ limit: 5 });
    provinces.forEach(p => console.log(`  ${p.code} - ${p.name}`));

    // 2. Get regencies for a province
    console.log('\n📋 Kabupaten di DKI JAKARTA (31):');
    const regencies = await regencyRepo.findByProvince('31');
    regencies.forEach(r => console.log(`  ${r.code} - ${r.name}`));

    // 3. Get districts for a regency
    console.log('\n📋 Kecamatan di KOTA JAKARTA SELATAN (3171):');
    const districts = await districtRepo.findByRegency('3171');
    districts.forEach(d => console.log(`  ${d.code} - ${d.name}`));

    // 4. Get villages for a district
    console.log('\n📋 Kelurahan di JAGAKARSA (3171010):');
    const villages = await villageRepo.findByDistrict('3171010');
    villages.forEach(v => console.log(`  ${v.code} - ${v.name}`));

    // 5. Search example
    console.log('\n🔍 Cari provinsi dengan kata "JAWA":');
    const searchResults = await provinceRepo.findAll({ search: 'JAWA' });
    searchResults.forEach(p => console.log(`  ${p.code} - ${p.name}`));

    // 6. Get statistics
    console.log('\n📊 Statistik:');
    console.log(`  Provinsi: ${await provinceRepo.count()}`);
    console.log(`  Kab/Kota: ${await regencyRepo.count()}`);
    console.log(`  Kecamatan: ${await districtRepo.count()}`);
    console.log(`  Kelurahan: ${await villageRepo.count()}`);

    // 7. Example of recording a change (manual)
    console.log('\n📝 Contoh recording perubahan:');
    const sampleChange = await syncService.recordChange({
      change_type: 'TRANSFER',
      old_code: '1101',
      new_code: '1101',
      old_parent_code: '11',
      new_parent_code: '11',
      old_name: 'KABUPATEN SIMEULUE',
      new_name: 'KABUPATEN SIMEULUE',
      effective_date: '2024-01-01',
      reference_number: 'Permendagri No. 1/2024',
      description: 'Sample change for demonstration'
    });
    console.log(`  Created change record with ID: ${sampleChange.id}`);

    // 8. Get history for a code
    console.log('\n📜 History untuk kode 1101:');
    const history = await syncService.getHistory('1101');
    history.forEach(h => console.log(`  [${h.change_type}] ${h.old_name} → ${h.new_name || 'same'} (${h.effective_date})`));

  } finally {
    closeDb();
  }
}

main().catch(console.error);
