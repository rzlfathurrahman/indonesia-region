import { Knex } from 'knex';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
      connection: string;
    };
    tables: {
      status: 'ok' | 'error';
      provinces: number;
      regencies: number;
      districts: number;
      villages: number;
    };
    cache?: {
      status: 'ok' | 'error';
      hits: number;
      misses: number;
      hitRate: number;
    };
  };
}

export interface HealthCheckOptions {
  includeCache?: boolean;
  timeoutMs?: number;
}

export class HealthCheckService {
  private db: Knex;
  private startTime: number;

  constructor(db?: Knex) {
    this.db = db || require('../core/database').getDb();
    this.startTime = Date.now();
  }

  async check(options: HealthCheckOptions = {}): Promise<HealthCheckResult> {
    const { includeCache = false, timeoutMs = 5000 } = options;

    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: await this.checkDatabase(timeoutMs),
        tables: await this.checkTables()
      }
    };

    if (includeCache) {
      result.checks.cache = await this.checkCache();
    }

    // Determine overall status
    if (result.checks.database.status === 'down') {
      result.status = 'unhealthy';
    } else if (result.checks.tables.status === 'error') {
      result.status = 'degraded';
    }

    return result;
  }

  private async checkDatabase(timeoutMs: number): Promise<HealthCheckResult['checks']['database']> {
    const start = Date.now();

    try {
      await Promise.race([
        this.db.raw('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
      ]);

      const latencyMs = Date.now() - start;

      return {
        status: 'up',
        latencyMs,
        connection: this.db.client.config.client as string
      };
    } catch (error: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        connection: this.db.client.config.client as string
      };
    }
  }

  private async checkTables(): Promise<HealthCheckResult['checks']['tables']> {
    try {
      const [provinces, regencies, districts, villages] = await Promise.all([
        this.db('provinces').count('code as count').first(),
        this.db('regencies').count('code as count').first(),
        this.db('districts').count('code as count').first(),
        this.db('villages').count('code as count').first()
      ]);

      return {
        status: 'ok',
        provinces: Number(provinces?.count) || 0,
        regencies: Number(regencies?.count) || 0,
        districts: Number(districts?.count) || 0,
        villages: Number(villages?.count) || 0
      };
    } catch (error: any) {
      return {
        status: 'error',
        provinces: 0,
        regencies: 0,
        districts: 0,
        villages: 0
      };
    }
  }

  private async checkCache(): Promise<HealthCheckResult['checks']['cache']> {
    try {
      // Import cache service dynamically
      const { getDefaultCache } = require('../core/cache');
      const cache = getDefaultCache();
      const stats = cache.getStats();

      return {
        status: 'ok',
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate
      };
    } catch (error: any) {
      return {
        status: 'error',
        hits: 0,
        misses: 0,
        hitRate: 0
      };
    }
  }

  async getUptime(): Promise<{ started: string; uptimeMs: number; uptimeFormatted: string }> {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeFormatted = this.formatUptime(uptimeMs);

    return {
      started: new Date(this.startTime).toISOString(),
      uptimeMs,
      uptimeFormatted
    };
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
