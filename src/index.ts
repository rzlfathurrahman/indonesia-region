// Types
export * from './types';

// Core (always included)
export {
  DatabaseConfig,
  DatabaseClient,
  getDb,
  closeDb,
  getDbInstance,
  initSchema,
  PerformanceCache,
  CacheOptions,
  CacheStats,
  getDefaultCache,
  clearDefaultCache,
  QueryBuilder,
  QueryOptions
} from './core';

// Core Repositories (always included)
export {
  ProvinceRepository,
  RegencyRepository,
  DistrictRepository,
  VillageRepository,
  ChangeRepository
} from './repositories';

// Core Services (always included)
export { SyncService, SyncOptions } from './services/sync.service';

// Optional: Hierarchy Module
export { HierarchyService, HierarchyPath, FullAddress } from './services/hierarchy.service';

// Optional: Validation Module
export { ValidationService, ValidationResult, ValidationError } from './services/validation.service';

// Optional: Validation Rules Module
export {
  ValidationRulesService,
  ValidationRule,
  FieldValidationRules,
  ValidationResult as ValidationResult2,
  ValidationError as ValidationError2,
  ValidationRuleType
} from './services/validation-rules.service';

// Optional: Event Module
export { EventService, EventType, WilayahEvent, EventHandler } from './services/event.service';

// Optional: Export Module
export { ExportService, ExportOptions } from './services/export.service';

// Optional: GeoJSON Module
export { GeoJsonService, GeoJsonFeatureCollection, GeoJsonOptions } from './services/geojson.service';

// Optional: Search Module
export { SearchService, SearchResult, SearchOptions } from './services/search.service';

// Optional: Bulk Module
export { BulkService, BulkOperationResult, BulkError, BulkInsertOptions } from './services/bulk.service';

// Optional: Audit Module
export { AuditService, AuditLog, AuditOptions, AuditQueryOptions } from './services/audit.service';

// Optional: Statistics Module
export { StatisticsService, RegionStats, ProvinceStats, FullStats } from './services/statistics.service';

// Optional: Import Module
export { ImportService, ImportResult, ImportError, ImportOptions } from './services/import.service';

// Optional: Soft Delete Module
export { SoftDeleteService, SoftDeleteOptions, RestoreResult } from './services/soft-delete.service';

// Optional: Diff Module
export { DiffService, DiffResult, DiffItem, DiffModified, FullDiff } from './services/diff.service';

// Optional: Streaming Module
export { StreamingService, StreamingOptions } from './services/streaming.service';

// Optional: Compression Module
export { CompressionService, CompressionType, CompressOptions } from './services/compression.service';

// Optional: Geocoding Module
export { GeocodingService, Coordinates, GeoRegion, GeocodingOptions } from './services/geocoding.service';

// Optional: Postal Code Module
export { PostalCodeService, PostalCode, PostalCodeQueryOptions } from './services/postal-code.service';

// Optional: Migration Module
export { MigrationService, Migration, MigrationRecord } from './services/migration.service';

// Optional: Backup Module
export { BackupService, BackupOptions, BackupInfo } from './services/backup.service';

// Optional: Health Check Module
export { HealthCheckService, HealthCheckResult, HealthCheckOptions } from './services/health-check.service';

// Optional: CodeGen Module
export { CodeGenService, CodeGenOptions } from './services/codegen.service';

// Optional: API Generator Module
export { ApiGeneratorService, ApiGeneratorOptions, EndpointConfig, ApiRoutes } from './services/api-generator.service';

// Factory functions
import { Knex } from 'knex';
import { getDb, DatabaseConfig, PerformanceCache } from './core';
import { ProvinceRepository, RegencyRepository, DistrictRepository, VillageRepository, ChangeRepository } from './repositories';
import { SyncService } from './services/sync.service';
import { HierarchyService } from './services/hierarchy.service';
import { ValidationService } from './services/validation.service';
import { ValidationRulesService } from './services/validation-rules.service';
import { EventService } from './services/event.service';
import { ExportService } from './services/export.service';
import { GeoJsonService } from './services/geojson.service';
import { SearchService } from './services/search.service';
import { BulkService } from './services/bulk.service';
import { AuditService } from './services/audit.service';
import { StatisticsService } from './services/statistics.service';
import { ImportService } from './services/import.service';
import { SoftDeleteService } from './services/soft-delete.service';
import { DiffService } from './services/diff.service';
import { StreamingService } from './services/streaming.service';
import { CompressionService } from './services/compression.service';
import { GeocodingService } from './services/geocoding.service';
import { PostalCodeService } from './services/postal-code.service';
import { MigrationService } from './services/migration.service';
import { BackupService } from './services/backup.service';
import { HealthCheckService } from './services/health-check.service';
import { CodeGenService } from './services/codegen.service';
import { ApiGeneratorService } from './services/api-generator.service';

// Repository factories
export function createProvinceRepo(db?: Knex): ProvinceRepository {
  return new ProvinceRepository(db);
}

export function createRegencyRepo(db?: Knex): RegencyRepository {
  return new RegencyRepository(db);
}

export function createDistrictRepo(db?: Knex): DistrictRepository {
  return new DistrictRepository(db);
}

export function createVillageRepo(db?: Knex): VillageRepository {
  return new VillageRepository(db);
}

export function createChangeRepo(db?: Knex): ChangeRepository {
  return new ChangeRepository(db);
}

// Service factories
export function createSyncService(db?: Knex): SyncService {
  return new SyncService(db);
}

export function createHierarchyService(db?: Knex): HierarchyService {
  return new HierarchyService(db);
}

export function createValidationService(db?: Knex): ValidationService {
  return new ValidationService(db);
}

export function createValidationRulesService(db?: Knex): ValidationRulesService {
  return new ValidationRulesService(db);
}

export function createEventService(db?: Knex): EventService {
  return new EventService(db);
}

export function createExportService(db?: Knex): ExportService {
  return new ExportService(db);
}

export function createGeoJsonService(db?: Knex): GeoJsonService {
  return new GeoJsonService(db);
}

export function createSearchService(db?: Knex): SearchService {
  return new SearchService(db);
}

export function createBulkService(db?: Knex): BulkService {
  return new BulkService(db);
}

export function createAuditService(db?: Knex): AuditService {
  return new AuditService(db);
}

export function createStatisticsService(db?: Knex): StatisticsService {
  return new StatisticsService(db);
}

export function createImportService(db?: Knex): ImportService {
  return new ImportService(db);
}

export function createSoftDeleteService(db?: Knex): SoftDeleteService {
  return new SoftDeleteService(db);
}

export function createDiffService(db?: Knex): DiffService {
  return new DiffService(db);
}

export function createStreamingService(db?: Knex): StreamingService {
  return new StreamingService(db);
}

export function createCompressionService(): CompressionService {
  return new CompressionService();
}

export function createGeocodingService(db?: Knex): GeocodingService {
  return new GeocodingService(db);
}

export function createPostalCodeService(db?: Knex): PostalCodeService {
  return new PostalCodeService(db);
}

export function createMigrationService(db?: Knex, migrationsDir?: string): MigrationService {
  return new MigrationService(db, migrationsDir);
}

export function createBackupService(db?: Knex, backupDir?: string): BackupService {
  return new BackupService(db, backupDir);
}

export function createHealthCheckService(db?: Knex): HealthCheckService {
  return new HealthCheckService(db);
}

export function createCodeGenService(db?: Knex): CodeGenService {
  return new CodeGenService(db);
}

export function createApiGeneratorService(db?: Knex, options?: any): ApiGeneratorService {
  return new ApiGeneratorService(db, options);
}

// Initialize database with config
export function initialize(config: DatabaseConfig): Knex {
  return getDb(config);
}

// Cache factory
export function createCache(options?: any): PerformanceCache {
  return new PerformanceCache(options);
}
