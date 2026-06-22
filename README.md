# 🇮🇩 Indonesia Wilayah

[![npm version](https://img.shields.io/npm/v/@cazh/indonesia-wilayah.svg)](https://www.npmjs.com/package/@cazh/indonesia-wilayah)
[![CI](https://github.com/rzlfathurrahman/indonesia-region/actions/workflows/ci.yml/badge.svg)](https://github.com/rzlfathurrahman/indonesia-region/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dt/@cazh/indonesia-wilayah.svg)](https://www.npmjs.com/package/@cazh/indonesia-wilayah)

Library Node.js untuk data wilayah administratif Indonesia dengan modular architecture, high performance, dan CLI.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Database Configuration](#database-configuration)
- [CLI Usage](#cli-usage)
- [API Reference](#api-reference)
- [Performance](#performance)
- [Storage Requirements](#storage-requirements)
- [Architecture](#architecture)
- [Module List](#module-list)
- [Examples](#examples)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core (Always Included)
- 📦 **Multi-Database** - SQLite, PostgreSQL, MySQL
- 🔄 **Sync from CSV** - Import data dari official sources
- 📝 **Change Tracking** - Log perubahan wilayah
- ⚡ **Query Builder** - Optimized queries with caching
- 🗑️ **Soft Delete** - Non-destructive deletion

### Optional Modules
- 🔍 **Hierarchy Lookup** - Auto-resolve full path
- ✅ **Validation** - Validasi kode & nama wilayah
- 🎯 **Event Emitter** - Event saat ada perubahan
- 📤 **Export** - JSON, CSV
- 🗺️ **GeoJSON Export** - For mapping (Leaflet/Mapbox)
- 🔎 **Full-text Search** - Search dengan ranking
- 📦 **Bulk Operations** - Batch insert/update/delete
- 📋 **Audit Trail** - Log perubahan data
- 📈 **Statistics** - Count & summary
- 📥 **Import** - Import CSV/JSON
- 🗑️ **Soft Delete + Restore** - Undo capability
- 📊 **Diff Report** - Laporan perubahan antar versi
- 🌊 **Streaming** - Large dataset support
- 🗜️ **Compression** - Auto-compress exports
- 🌐 **Geocoding** - Lat/lng coordinates
- 📍 **Distance Finder** - Cari wilayah terdekat
- 📮 **Postal Code** - Kode pos integration
- 🔄 **Migration** - Schema versioning
- 💾 **Backup/Restore** - Database backup utilities
- 🏥 **Health Check** - Monitor DB health
- 🔧 **TypeScript Codegen** - Auto-generate types
- 🛠️ **REST API Generator** - Auto-generate API endpoints
- ✅ **Validation Rules** - Custom validation per field

## Installation

### Full Install (All Features)
```bash
npm install @cazh/indonesia-wilayah better-sqlite3
```

### Minimal Install (Core Only)
```bash
npm install @cazh/indonesia-wilayah
```

### PostgreSQL
```bash
npm install @cazh/indonesia-wilayah pg
```

### MySQL
```bash
npm install @cazh/indonesia-wilayah mysql2
```

### With Express (for API Generator)
```bash
npm install @cazh/indonesia-wilayah express @types/express
```

## Quick Start

```typescript
import { 
  initialize, 
  createProvinceRepo, 
  createHierarchyService,
  closeDb 
} from '@cazh/indonesia-wilayah';

// Initialize database
const db = initialize({ client: 'sqlite3' });

// Get provinces
const provinces = await createProvinceRepo(db).findAll();

// Resolve hierarchy from any code
const hierarchy = await createHierarchyService(db);
const address = await hierarchy.getFullAddress('3171010001');
// => "JAGAKARSA, KOTA JAKARTA SELATAN, DKI JAKARTA"

closeDb();
```

## Database Configuration

### SQLite (Default - Zero Config)
```typescript
const db = initialize({ 
  client: 'sqlite3',
  dbPath: './data/wilayah.db'  // optional
});
```

### PostgreSQL
```typescript
const db = initialize({ 
  client: 'pg',
  connection: 'postgres://user:pass@localhost:5432/wilayah',
  pool: { min: 2, max: 10 }
});
```

### MySQL
```typescript
const db = initialize({ 
  client: 'mysql2',
  connection: {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wilayah'
  }
});
```

## CLI Usage

### Setup
```bash
# Initialize database
npx wilayah init

# Seed from CSV
npx wilayah seed --csv-dir ./data/csv

# Show statistics
npx wilayah stats
```

### Query
```bash
# Search regions
npx wilayah search "JAKARTA"

# Show hierarchy
npx wilayah hierarchy 3171010001

# List regions
npx wilayah list province
npx wilayah list regency --parent 31
npx wilayah list district --parent 3171 --limit 10
```

### Export
```bash
# Export to JSON
npx wilayah export json --level province

# Export to CSV
npx wilayah export csv --level regency --parent 31

# Export GeoJSON (for maps)
npx wilayah export geojson --level district --output districts.geojson

# Export full hierarchy
npx wilayah export hierarchy -o hierarchy.json
```

### Sync & Diff
```bash
# Sync from CSV
npx wilayah sync --csv-dir ./data/csv

# Dry run (preview changes)
npx wilayah sync --dry-run

# Compare with source
npx wilayah diff --csv-dir ./data/csv
```

### Soft Delete
```bash
# Show deleted regions
npx wilayah deleted
npx wilayah deleted --level province

# Restore deleted region
npx wilayah restore 3171
```

### CLI Options
```
Global Options:
  -d, --db <path>           Database path (default: ./data/wilayah.db)
  -c, --client <client>     Database client (sqlite3, pg, mysql2)
  --connection <conn>       Database connection string

Search Options:
  -l, --limit <limit>       Max results (default: 10)
  -t, --type <type>         Filter by type

List Options:
  -p, --parent <code>       Parent code filter
  -s, --search <keyword>    Search keyword

Export Options:
  -o, --output <file>       Output file

Sync Options:
  --csv-dir <dir>           CSV directory (default: ./data/csv)
  --dry-run                 Preview changes without applying
```

## API Reference

### Core Functions

```typescript
// Initialize database
import { initialize, closeDb } from '@cazh/indonesia-wilayah';

const db = initialize({ client: 'sqlite3' });
// ... use library
closeDb();
```

### Repositories

```typescript
import { createProvinceRepo, createRegencyRepo, createDistrictRepo, createVillageRepo } from '@cazh/indonesia-wilayah';

// Province
const provinceRepo = createProvinceRepo(db);
await provinceRepo.findAll({ search: 'JAWA', limit: 10 });
await provinceRepo.findByCode('11');
await provinceRepo.create({ code: '99', name: 'CONTOH', is_active: true });
await provinceRepo.update('99', { name: 'BARU' });
await provinceRepo.softDelete('99');
await provinceRepo.bulkInsert([...]);

// Same pattern for Regency, District, Village
const regencyRepo = createRegencyRepo(db);
await regencyRepo.findByProvince('31');

const districtRepo = createDistrictRepo(db);
await districtRepo.findByRegency('3171');

const villageRepo = createVillageRepo(db);
await villageRepo.findByDistrict('3171010');
```

### Services

```typescript
// Hierarchy
import { createHierarchyService } from '@cazh/indonesia-wilayah';

const hierarchy = createHierarchyService(db);
await hierarchy.getFullAddress('3171010001');
await hierarchy.getChildren('31');
await hierarchy.getAncestors('3171010001');
await hierarchy.searchByKeyword('JAKARTA');

// Search
import { createSearchService } from '@cazh/indonesia-wilayah';

const search = createSearchService(db);
await search.search('JAKARTA', { levels: ['province', 'regency'] });
await search.searchExact('ACEH');
await search.autocomplete('jak');

// GeoJSON
import { createGeoJsonService } from '@cazh/indonesia-wilayah';

const geojson = createGeoJsonService(db);
await geojson.exportProvinces();
await geojson.exportRegencies('31');
await geojson.exportHierarchyWithFullPath();

// Statistics
import { createStatisticsService } from '@cazh/indonesia-wilayah';

const stats = createStatisticsService(db);
await stats.getFullStats();
await stats.getTopProvincesByRegionCount(10);
await stats.getChangeStats('2024-01-01');

// Validation
import { createValidationService } from '@cazh/indonesia-wilayah';

const validation = createValidationService(db);
validation.validateCode('3171');
await validation.validateHierarchy('3171010');
await validation.validateName('JAKARTA', 'regency');

// Validation Rules
import { createValidationRulesService } from '@cazh/indonesia-wilayah';

const rules = createValidationRulesService(db);
await rules.validateObject(data, rules.getProvinceValidationRules());

// Audit
import { createAuditService } from '@cazh/indonesia-wilayah';

const audit = createAuditService(db);
await audit.initTable();
await audit.logInsert('provinces', '99', { code: '99', name: 'CONTOH' });
await audit.getRecordHistory('provinces', '99');
await audit.getUserActivity('user123');

// Bulk Operations
import { createBulkService } from '@cazh/indonesia-wilayah';

const bulk = createBulkService(db);
await bulk.bulkInsertProvinces([...]);
await bulk.bulkUpdateProvinces([...]);
await bulk.bulkSoftDeleteProvinces(['99', '98']);
await bulk.bulkRestoreProvinces(['99']);

// Soft Delete + Restore
import { createSoftDeleteService } from '@cazh/indonesia-wilayah';

const softDelete = createSoftDeleteService(db);
await softDelete.softDeleteProvince('99');
await softDelete.restoreProvince('99');
await softDelete.getDeletedProvinces();
await softDelete.getDeletedStats();

// Import/Export
import { createImportService, createExportService } from '@cazh/indonesia-wilayah';

const importService = createImportService(db);
await importService.importProvinces('./data/provinces.csv');
await importService.importFromJson('provinces', jsonString);
await importService.exportToCsv('provinces', './output.csv');
await importService.exportToJson('provinces', './output.json');

const exportService = createExportService(db);
await exportService.exportProvinces({ format: 'csv' });
await exportService.exportHierarchy();
await exportService.exportFlat();

// Diff
import { createDiffService } from '@cazh/indonesia-wilayah';

const diff = createDiffService(db);
const result = await diff.compareWithSource({...});
console.log(diff.generateReport(result));

// Streaming (for large datasets)
import { createStreamingService } from '@cazh/indonesia-wilayah';

const streaming = createStreamingService(db);
await streaming.streamVillages(async (batch) => {
  // Process batch of 1000 villages
  console.log(`Processing ${batch.length} villages`);
});

// Compression
import { createCompressionService } from '@cazh/indonesia-wilayah';

const compression = createCompressionService();
await compression.compressFile('data.json', 'data.json.gz', 'gzip');
await compression.decompressFile('data.json.gz', 'data.json', 'gzip');

// Geocoding
import { createGeocodingService } from '@cazh/indonesia-wilayah';

const geocoding = createGeocodingService(db);
await geocoding.initGeoColumns();
await geocoding.updateCoordinates('province', '11', { latitude: 4.6951, longitude: 96.7494 });
await geocoding.findNearby('regency', { latitude: -6.2088, longitude: 106.8456 }, 50);
await geocoding.calculateDistance(coord1, coord2);

// Postal Code
import { createPostalCodeService } from '@cazh/indonesia-wilayah';

const postalCode = createPostalCodeService(db);
await postalCode.initTable();
await postalCode.findByCode('12345');
await postalCode.findByVillageCode('1101010001');
await postalCode.searchPostalCodes('JAKARTA');

// Migration
import { createMigrationService } from '@cazh/indonesia-wilayah';

const migration = createMigrationService(db);
await migration.run(migrations);
await migration.rollback(1);
await migration.getStatus(migrations);
await migration.createMigrationFile('add-postal-codes');

// Backup
import { createBackupService } from '@cazh/indonesia-wilayah';

const backup = createBackupService(db);
const backupInfo = await backup.backup({ compression: true });
await backup.restore(backupInfo.path);
await backup.listBackups();

// Health Check
import { createHealthCheckService } from '@cazh/indonesia-wilayah';

const health = createHealthCheckService(db);
const status = await health.check();
console.log(status.status); // 'healthy' | 'degraded' | 'unhealthy'

// Code Generation
import { createCodeGenService } from '@cazh/indonesia-wilayah';

const codegen = createCodeGenService(db);
const types = await codegen.generateTypes();
await codegen.saveTypesToFile('./src/types/generated.ts');

// API Generator
import { createApiGeneratorService } from '@cazh/indonesia-wilayah';

const apiGen = createApiGeneratorService(db);
const routes = apiGen.generateRoutes();
const openApi = apiGen.generateOpenApiSpec();
const expressRouter = apiGen.generateExpressRouter();
```

### Events

```typescript
import { createEventService } from '@cazh/indonesia-wilayah';

const events = createEventService(db);

events.onEvent('province:created', (event) => {
  console.log('Province created:', event.data);
});

events.onEvent('change:recorded', (event) => {
  console.log('Change recorded:', event.data);
});

events.onEvent('sync:completed', (event) => {
  console.log('Sync completed:', event.data.results);
});

// Available events:
// - province:created, province:updated, province:deleted
// - regency:created, regency:updated, regency:deleted
// - district:created, district:updated, district:deleted
// - village:created, village:updated, village:deleted
// - change:recorded
// - sync:completed
```

### Cache

```typescript
import { createCache } from '@cazh/indonesia-wilayah';

const cache = createCache({
  ttl: 5 * 60 * 1000,  // 5 minutes
  maxSize: 10000,       // Max 10K entries
  enableStats: true     // Track hit rates
});

// Auto-cached via QueryBuilder
const provinces = await provinceRepo.findAll(); // Cached automatically

// Manual cache operations
cache.set('key', value, 60000); // Custom TTL
cache.get('key');
cache.invalidatePattern('^province:');
console.log(cache.getStats()); // { hits, misses, hitRate }
```

## Performance

### Benchmarks

| Operation | Without Cache | With Cache | Improvement |
|-----------|---------------|------------|-------------|
| Get Province | ~5ms | ~0.1ms | 50x |
| Get Regencies | ~15ms | ~0.5ms | 30x |
| Get Districts | ~25ms | ~1ms | 25x |
| Get Villages | ~50ms | ~2ms | 25x |
| Get Hierarchy | ~30ms | ~1ms | 30x |
| Search | ~100ms | ~10ms | 10x |
| Bulk Insert (1000) | ~200ms | N/A | N/A |

### Performance Features

1. **LRU Cache** - In-memory cache with configurable TTL and max size
2. **Database Indexes** - Auto-created indexes for common queries
3. **Connection Pooling** - Configurable min/max connections
4. **Batch Queries** - Optimized bulk operations
5. **Join Optimization** - Single query instead of N+1
6. **Streaming** - Process large datasets without memory issues
7. **Compression** - Reduce export file sizes by 70-90%

### Tuning Tips

```typescript
// Optimal configuration for high traffic
const db = initialize({
  client: 'pg',
  connection: 'postgres://...',
  pool: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 30000
  }
});

// Enable caching
const cache = createCache({
  ttl: 10 * 60 * 1000,  // 10 minutes
  maxSize: 50000,
  enableStats: true
});

// Use streaming for large exports
const streaming = createStreamingService(db);
await streaming.streamVillages(async (batch) => {
  // Process in batches of 1000
}, { batchSize: 1000 });
```

## Storage Requirements

### Library Size

| Component | Size |
|-----------|------|
| npm package | ~500KB |
| dist/ (compiled) | ~1MB |
| node_modules (with deps) | ~12MB |
| node_modules (core only) | ~5MB |

### Database Size (SQLite)

| Table | Rows | Size |
|-------|------|------|
| provinces | ~34 | ~10KB |
| regencies | ~514 | ~100KB |
| districts | ~7,000 | ~1MB |
| villages | ~80,000 | ~10MB |
| region_changes | varies | ~100KB |
| **Total** | ~87,548 | **~11MB** |

### Database Size (PostgreSQL/MySQL)

| Table | Rows | Size |
|-------|------|------|
| All tables | ~87,548 | ~15-20MB |
| With indexes | ~87,548 | ~25-30MB |

### Memory Requirements

| Scenario | RAM |
|----------|-----|
| Minimal (SQLite, no cache) | ~30MB |
| Default (SQLite + cache) | ~50-80MB |
| Production (PostgreSQL + cache) | ~100-200MB |
| High traffic (PostgreSQL + large cache) | ~200-500MB |

### Disk Space

| Scenario | Disk |
|----------|------|
| Library only | ~2MB |
| With SQLite database | ~15MB |
| With backups | ~50-100MB |
| With exports | varies |

## Architecture

```
src/
├── core/                        ← Core (always included)
│   ├── database.ts              # Multi-DB + connection pooling
│   ├── cache.ts                 # LRU cache with stats
│   ├── query-builder.ts         # Optimized queries
│   └── index.ts
├── repositories/                ← Data access layer
│   ├── province.repository.ts
│   ├── regency.repository.ts
│   ├── district.repository.ts
│   ├── village.repository.ts
│   └── change.repository.ts
├── services/                    ← Business logic (optional)
│   ├── sync.service.ts
│   ├── hierarchy.service.ts
│   ├── validation.service.ts
│   ├── validation-rules.service.ts
│   ├── event.service.ts
│   ├── export.service.ts
│   ├── geojson.service.ts
│   ├── search.service.ts
│   ├── bulk.service.ts
│   ├── audit.service.ts
│   ├── statistics.service.ts
│   ├── import.service.ts
│   ├── soft-delete.service.ts
│   ├── diff.service.ts
│   ├── streaming.service.ts
│   ├── compression.service.ts
│   ├── geocoding.service.ts
│   ├── postal-code.service.ts
│   ├── migration.service.ts
│   ├── backup.service.ts
│   ├── health-check.service.ts
│   ├── codegen.service.ts
│   └── api-generator.service.ts
├── types/                       ← TypeScript types
│   └── index.ts
├── utils/                       ← Utilities
│   └── csv.ts
└── cli/                         ← CLI tool
    └── index.ts
```

## Module List

### Core Modules (Always Included)

| Module | Import | Description |
|--------|--------|-------------|
| Database | `@cazh/indonesia-wilayah/core` | Multi-DB support |
| Cache | `@cazh/indonesia-wilayah/core` | LRU cache |
| Query Builder | `@cazh/indonesia-wilayah/core` | Optimized queries |
| Province Repo | `@cazh/indonesia-wilayah/repositories` | Province CRUD |
| Regency Repo | `@cazh/indonesia-wilayah/repositories` | Regency CRUD |
| District Repo | `@cazh/indonesia-wilayah/repositories` | District CRUD |
| Village Repo | `@cazh/indonesia-wilayah/repositories` | Village CRUD |
| Change Repo | `@cazh/indonesia-wilayah/repositories` | Change tracking |
| Sync Service | `@cazh/indonesia-wilayah/services/sync` | CSV sync |

### Optional Modules

| Module | Import | Description |
|--------|--------|-------------|
| Hierarchy | `@cazh/indonesia-wilayah/services/hierarchy` | Path resolution |
| Validation | `@cazh/indonesia-wilayah/services/validation` | Code validation |
| Validation Rules | `@cazh/indonesia-wilayah/services/validation-rules` | Custom rules |
| Event | `@cazh/indonesia-wilayah/services/event` | Event emitter |
| Export | `@cazh/indonesia-wilayah/services/export` | JSON/CSV export |
| GeoJSON | `@cazh/indonesia-wilayah/services/geojson` | GeoJSON export |
| Search | `@cazh/indonesia-wilayah/services/search` | Full-text search |
| Bulk | `@cazh/indonesia-wilayah/services/bulk` | Batch operations |
| Audit | `@cazh/indonesia-wilayah/services/audit` | Audit trail |
| Statistics | `@cazh/indonesia-wilayah/services/statistics` | Stats & counts |
| Import | `@cazh/indonesia-wilayah/services/import` | CSV/JSON import |
| Soft Delete | `@cazh/indonesia-wilayah/services/soft-delete` | Undo capability |
| Diff | `@cazh/indonesia-wilayah/services/diff` | Diff report |
| Streaming | `@cazh/indonesia-wilayah/services/streaming` | Large datasets |
| Compression | `@cazh/indonesia-wilayah/services/compression` | Gzip support |
| Geocoding | `@cazh/indonesia-wilayah/services/geocoding` | Coordinates |
| Postal Code | `@cazh/indonesia-wilayah/services/postal-code` | Kode pos |
| Migration | `@cazh/indonesia-wilayah/services/migration` | Schema versioning |
| Backup | `@cazh/indonesia-wilayah/services/backup` | Backup/restore |
| Health Check | `@cazh/indonesia-wilayah/services/health-check` | Monitoring |
| CodeGen | `@cazh/indonesia-wilayah/services/codegen` | Type generation |
| API Generator | `@cazh/indonesia-wilayah/services/api-generator` | REST API gen |

## Kode Wilayah

| Level | Length | Example | Description |
|-------|--------|---------|-------------|
| Provinsi | 2 digit | `11` | ACEH |
| Kab/Kota | 4 digit | `1101` | KAB. SIMEULUE |
| Kecamatan | 7 digit | `1101010` | TEUPAH SELATAN |
| Kelurahan | 10 digit | `1101010001` | KUTA PADANG |

## Change Types

| Type | Description | Example |
|------|-------------|---------|
| `SPLIT` | Pemekaran wilayah | Kabupaten baru dari kabupaten lama |
| `MERGE` | Penggabungan wilayah | Dua kecamatan digabung |
| `RENAME` | Perubahan nama | Nama kabupaten berubah |
| `TRANSFER` | Pindah induk | Kecamatan pindah kabupaten |

## Examples

### Basic Usage

```typescript
import { initialize, createProvinceRepo, closeDb } from '@cazh/indonesia-wilayah';

const db = initialize({ client: 'sqlite3' });
const repo = createProvinceRepo(db);

// Get all provinces
const provinces = await repo.findAll();
console.log(provinces);

// Search
const results = await repo.findAll({ search: 'JAWA' });
console.log(results);

closeDb();
```

### With Hierarchy

```typescript
import { initialize, createHierarchyService, closeDb } from '@cazh/indonesia-wilayah';

const db = initialize({ client: 'sqlite3' });
const hierarchy = createHierarchyService(db);

// Get full address
const address = await hierarchy.getFullAddress('3171010001');
console.log(address.full_path);
// => "JAGAKARSA, KOTA JAKARTA SELATAN, DKI JAKARTA"

// Get children
const regencies = await hierarchy.getChildren('31');
console.log(regencies.items);

closeDb();
```

### With Search

```typescript
import { initialize, createSearchService, closeDb } from '@cazh/indonesia-wilayah';

const db = initialize({ client: 'sqlite3' });
const search = createSearchService(db);

// Search
const results = await search.search('JAKARTA', {
  levels: ['regency', 'district'],
  limit: 10
});

// Autocomplete
const suggestions = await search.autocomplete('jak', 5);

closeDb();
```

### With Events

```typescript
import { initialize, createEventService, createProvinceRepo, closeDb } from '@cazh/indonesia-wilayah';

const db = initialize({ client: 'sqlite3' });
const events = createEventService(db);
const repo = createProvinceRepo(db);

// Listen to events
events.onEvent('province:created', (event) => {
  console.log('New province:', event.data);
});

// Create province (will emit event)
await repo.create({ code: '99', name: 'NEW PROVINCE', is_active: true });

closeDb();
```

### With Backup

```typescript
import { initialize, createBackupService, closeDb } from '@cazh/indonesia-wilayah';

const db = initialize({ client: 'sqlite3' });
const backup = createBackupService(db);

// Create backup
const info = await backup.backup({ compression: true });
console.log(`Backup created: ${info.path} (${info.size} bytes)`);

// List backups
const backups = await backup.listBackups();
console.log(backups);

// Restore
await backup.restore(backups[0].path);

closeDb();
```

## FAQ

### Q: Database apa yang harus dipilih?

**A:**
- **SQLite** - Untuk开发/测试 atau aplikasi single-user
- **PostgreSQL** - Untuk production dengan banyak concurrent users
- **MySQL** - Jika sudah menggunakan MySQL di stack

### Q: Berapa data yang bisa ditampung?

**A:**
- **SQLite**: Hingga 281 TB (teoritis), praktis ~1 juta rows
- **PostgreSQL/MySQL**: Tidak ada batasan praktis

### Q: Bagaimana handle perubahan wilayah?

**A:**
- Gunakan `region_changes` table untuk track perubahan
- Gunakan `SyncService` untuk auto-detect perubahan dari CSV
- Gunakan `DiffService` untuk generate laporan perubahan

### Q: Apakah bisa offline?

**A:**
Ya, SQLite berjalan offline. PostgreSQL/MySQL membutuhkan koneksi.

### Q: Bagaimana cara update data?

**A:**
1. Download CSV terbaru dari Kemendagri/BPS
2. Jalankan `npx wilayah sync --csv-dir ./data/csv`
3. Perubahan akan auto-track di `region_changes`

### Q: Berapa RAM yang dibutuhkan?

**A:**
- Minimal: 30MB
- Default: 50-80MB
- Production: 100-200MB
- High traffic: 200-500MB

## Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Create Pull Request

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## License

MIT
