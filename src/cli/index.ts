#!/usr/bin/env node

import { Command } from 'commander';
import { initialize, closeDb } from '../index';
import {
  createProvinceRepo,
  createRegencyRepo,
  createDistrictRepo,
  createVillageRepo,
  createSyncService,
  createHierarchyService,
  createSearchService,
  createStatisticsService,
  createExportService,
  createImportService,
  createDiffService,
  createSoftDeleteService,
  createGeoJsonService
} from '../index';

const program = new Command();

program
  .name('wilayah')
  .description('CLI untuk data wilayah Indonesia')
  .version('1.0.0');

// Global options
program
  .option('-d, --db <path>', 'Database path', './data/wilayah.db')
  .option('-c, --client <client>', 'Database client (sqlite3, pg, mysql2)', 'sqlite3')
  .option('--connection <connection>', 'Database connection string');

// Initialize command
program
  .command('init')
  .description('Initialize database')
  .action(async (options) => {
    try {
      const db = initialize({
        client: options.client as any,
        dbPath: options.db,
        connection: options.connection
      });

      console.log('✅ Database initialized successfully!');
      console.log(`   Client: ${options.client}`);
      console.log(`   Path: ${options.db}`);

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Seed command
program
  .command('seed')
  .description('Seed database from CSV files')
  .option('--csv-dir <dir>', 'CSV directory', './data/csv')
  .action(async (options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const syncService = createSyncService(db);

      console.log('🌱 Seeding database...');

      const results = await syncService.syncFromCsv({
        csvDir: options.csvDir
      });

      for (const result of results) {
        console.log(`   ${result.level}: +${result.added} ~${result.updated} -${result.deactivated}`);
      }

      console.log('✅ Seed completed!');
      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show statistics')
  .action(async (options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const statsService = createStatisticsService(db);

      const stats = await statsService.getFullStats();

      console.log('\n📊 Indonesia Wilayah Statistics\n');
      console.log('Summary:');
      console.log(`   Provinsi: ${stats.summary.provinces.active} active / ${stats.summary.provinces.total} total`);
      console.log(`   Kab/Kota: ${stats.summary.regencies.active} active / ${stats.summary.regencies.total} total`);
      console.log(`   Kecamatan: ${stats.summary.districts.active} active / ${stats.summary.districts.total} total`);
      console.log(`   Kelurahan: ${stats.summary.villages.active} active / ${stats.summary.villages.total} total`);
      console.log(`   Total: ${stats.summary.total}`);

      if (stats.topProvinces.length > 0) {
        console.log('\nTop 10 Provinsi by Region Count:');
        stats.topProvinces.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.name} (${p.code}): ${p.total_regions} regions`);
        });
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Search command
program
  .command('search <keyword>')
  .description('Search regions by keyword')
  .option('-l, --limit <limit>', 'Max results', '10')
  .option('-t, --type <type>', 'Filter by type (province, regency, district, village)')
  .action(async (keyword, options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const searchService = createSearchService(db);

      const levels = options.type ? [options.type] : undefined;
      const results = await searchService.search(keyword, {
        limit: parseInt(options.limit),
        levels: levels as any
      });

      console.log(`\n🔍 Search results for "${keyword}":\n`);

      if (results.length === 0) {
        console.log('   No results found.');
      } else {
        results.forEach((r, i) => {
          console.log(`   ${i + 1}. [${r.level}] ${r.code} - ${r.name}`);
          if (r.full_path) {
            console.log(`      📍 ${r.full_path}`);
          }
        });
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Hierarchy command
program
  .command('hierarchy <code>')
  .description('Show hierarchy for a code')
  .action(async (code, options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const hierarchyService = createHierarchyService(db);

      const address = await hierarchyService.getFullAddress(code);

      console.log(`\n📍 Hierarchy for ${code}:\n`);

      if (!address) {
        console.log('   Code not found.');
      } else {
        console.log(`   Province: ${address.province_code} - ${address.province_name}`);
        if (address.regency_code) {
          console.log(`   Regency:  ${address.regency_code} - ${address.regency_name}`);
        }
        if (address.district_code) {
          console.log(`   District: ${address.district_code} - ${address.district_name}`);
        }
        if (address.village_code) {
          console.log(`   Village:  ${address.village_code} - ${address.village_name}`);
        }
        console.log(`\n   Full: ${address.full_path}`);
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// List command
program
  .command('list <level>')
  .description('List regions at a level')
  .option('-p, --parent <code>', 'Parent code')
  .option('-s, --search <keyword>', 'Search keyword')
  .option('-l, --limit <limit>', 'Max results', '20')
  .action(async (level, options) => {
    try {
      const db = initialize({ client: 'sqlite3' });

      let results: any[] = [];

      switch (level) {
        case 'province':
          const provinceRepo = createProvinceRepo(db);
          results = await provinceRepo.findAll({ search: options.search, limit: parseInt(options.limit) });
          break;
        case 'regency':
          const regencyRepo = createRegencyRepo(db);
          results = await regencyRepo.findAll({ province_code: options.parent, search: options.search, limit: parseInt(options.limit) });
          break;
        case 'district':
          const districtRepo = createDistrictRepo(db);
          results = await districtRepo.findAll({ regency_code: options.parent, search: options.search, limit: parseInt(options.limit) });
          break;
        case 'village':
          const villageRepo = createVillageRepo(db);
          results = await villageRepo.findAll({ district_code: options.parent, search: options.search, limit: parseInt(options.limit) });
          break;
        default:
          console.error('❌ Invalid level. Use: province, regency, district, village');
          process.exit(1);
      }

      console.log(`\n📋 ${level.charAt(0).toUpperCase() + level.slice(1)}s:\n`);

      if (results.length === 0) {
        console.log('   No results found.');
      } else {
        results.forEach(r => {
          console.log(`   ${r.code} - ${r.name}`);
        });
        console.log(`\n   Total: ${results.length}`);
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Export command
program
  .command('export <format>')
  .description('Export data (json, csv, geojson, hierarchy)')
  .option('-l, --level <level>', 'Level to export (province, regency, district, village)')
  .option('-o, --output <file>', 'Output file')
  .option('-p, --parent <code>', 'Parent code filter')
  .action(async (format, options) => {
    try {
      const db = initialize({ client: 'sqlite3' });

      let output: string = '';

      if (format === 'geojson') {
        const geoJsonService = createGeoJsonService(db);
        const level = options.level || 'province';

        let geojson: any;
        switch (level) {
          case 'province':
            geojson = await geoJsonService.exportProvinces();
            break;
          case 'regency':
            geojson = await geoJsonService.exportRegencies(options.parent);
            break;
          case 'district':
            geojson = await geoJsonService.exportDistricts(options.parent);
            break;
          case 'village':
            geojson = await geoJsonService.exportVillages(options.parent);
            break;
          default:
            geojson = await geoJsonService.exportProvinces();
        }

        output = JSON.stringify(geojson, null, 2);
      } else if (format === 'hierarchy') {
        const geoJsonService = createGeoJsonService(db);
        const geojson = await geoJsonService.exportHierarchyWithFullPath();
        output = JSON.stringify(geojson, null, 2);
      } else {
        const exportService = createExportService(db);
        const level = options.level || 'province';

        switch (level) {
          case 'province':
            output = await exportService.exportProvinces({ format: format as any }) as string;
            break;
          case 'regency':
            output = await exportService.exportRegencies({ format: format as any }) as string;
            break;
          case 'district':
            output = await exportService.exportDistricts({ format: format as any }) as string;
            break;
          case 'village':
            output = await exportService.exportVillages({ format: format as any }) as string;
            break;
          default:
            output = await exportService.exportProvinces({ format: format as any }) as string;
        }
      }

      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, output);
        console.log(`✅ Exported to ${options.output}`);
      } else {
        console.log(output);
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync data from CSV')
  .option('--csv-dir <dir>', 'CSV directory', './data/csv')
  .option('--dry-run', 'Preview changes without applying')
  .action(async (options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const syncService = createSyncService(db);

      console.log('🔄 Syncing data...');

      const results = await syncService.syncFromCsv({
        csvDir: options.csvDir,
        dryRun: options.dryRun
      });

      for (const result of results) {
        console.log(`\n${result.level}:`);
        console.log(`   Added: ${result.added}`);
        console.log(`   Updated: ${result.updated}`);
        console.log(`   Deactivated: ${result.deactivated}`);
      }

      if (options.dryRun) {
        console.log('\n⚠️  Dry run - no changes applied');
      } else {
        console.log('\n✅ Sync completed!');
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Diff command
program
  .command('diff')
  .description('Compare with source CSV')
  .option('--csv-dir <dir>', 'CSV directory', './data/csv')
  .option('-o, --output <file>', 'Output file')
  .action(async (options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const diffService = createDiffService(db);
      const importService = createImportService(db);

      console.log('🔍 Comparing with source...');

      // Read source CSVs
      const fs = require('fs');
      const path = require('path');
      const { parseCsv } = require('../utils/csv');

      const provincesCsv = parseCsv(fs.readFileSync(path.join(options.csvDir, 'provinces.csv'), 'utf-8'));
      const regenciesCsv = parseCsv(fs.readFileSync(path.join(options.csvDir, 'regencies.csv'), 'utf-8'));
      const districtsCsv = parseCsv(fs.readFileSync(path.join(options.csvDir, 'districts.csv'), 'utf-8'));
      const villagesCsv = parseCsv(fs.readFileSync(path.join(options.csvDir, 'villages.csv'), 'utf-8'));

      const diff = await diffService.compareWithSource({
        provinces: provincesCsv.map((r: any) => ({ code: r.id || r.code, name: r.name })),
        regencies: regenciesCsv.map((r: any) => ({ code: r.id || r.code, province_code: r.province_id || r.province_code, name: r.name })),
        districts: districtsCsv.map((r: any) => ({ code: r.id || r.code, regency_code: r.regency_id || r.regency_code, name: r.name })),
        villages: villagesCsv.map((r: any) => ({ code: r.id || r.code, district_code: r.district_id || r.district_code, name: r.name }))
      });

      const report = diffService.generateReport(diff);

      if (options.output) {
        fs.writeFileSync(options.output, report);
        console.log(`✅ Report saved to ${options.output}`);
      } else {
        console.log(report);
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Deleted command
program
  .command('deleted')
  .description('Show deleted regions')
  .option('-l, --level <level>', 'Level (province, regency, district, village)')
  .action(async (options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const softDeleteService = createSoftDeleteService(db);

      console.log('\n🗑️  Deleted Regions:\n');

      const stats = await softDeleteService.getDeletedStats();

      if (options.level) {
        switch (options.level) {
          case 'province':
            const provinces = await softDeleteService.getDeletedProvinces();
            provinces.forEach(p => console.log(`   ${p.code} - ${p.name}`));
            break;
          case 'regency':
            const regencies = await softDeleteService.getDeletedRegencies();
            regencies.forEach(r => console.log(`   ${r.code} - ${r.name}`));
            break;
          case 'district':
            const districts = await softDeleteService.getDeletedDistricts();
            districts.forEach(d => console.log(`   ${d.code} - ${d.name}`));
            break;
          case 'village':
            const villages = await softDeleteService.getDeletedVillages();
            villages.forEach(v => console.log(`   ${v.code} - ${v.name}`));
            break;
        }
      } else {
        console.log(`   Provinsi: ${stats.provinces}`);
        console.log(`   Kab/Kota: ${stats.regencies}`);
        console.log(`   Kecamatan: ${stats.districts}`);
        console.log(`   Kelurahan: ${stats.villages}`);
        console.log(`   Total: ${stats.total}`);
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

// Restore command
program
  .command('restore <code>')
  .description('Restore a soft-deleted region')
  .action(async (code, options) => {
    try {
      const db = initialize({ client: 'sqlite3' });
      const softDeleteService = createSoftDeleteService(db);

      const codeLen = code.length;
      let restored = false;

      switch (codeLen) {
        case 2:
          restored = await softDeleteService.restoreProvince(code);
          break;
        case 4:
          restored = await softDeleteService.restoreRegency(code);
          break;
        case 7:
          restored = await softDeleteService.restoreDistrict(code);
          break;
        case 10:
          restored = await softDeleteService.restoreVillage(code);
          break;
        default:
          console.error('❌ Invalid code length');
          process.exit(1);
      }

      if (restored) {
        console.log(`✅ Restored ${code}`);
      } else {
        console.log(`❌ Code ${code} not found or not deleted`);
      }

      closeDb();
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
