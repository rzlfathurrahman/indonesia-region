import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface AuditLog {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE';
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditOptions {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryOptions {
  tableName?: string;
  recordId?: string;
  action?: AuditLog['action'];
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class AuditService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async initTable(): Promise<void> {
    const hasTable = await this.db.schema.hasTable('audit_logs');

    if (!hasTable) {
      await this.db.schema.createTable('audit_logs', (table) => {
        table.increments('id').primary();
        table.string('table_name', 50).notNullable();
        table.string('record_id', 20).notNullable();
        table.enum('action', ['INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE']).notNullable();
        table.json('old_data').nullable();
        table.json('new_data').nullable();
        table.json('changed_fields').nullable();
        table.string('user_id', 100).nullable();
        table.string('ip_address', 45).nullable();
        table.text('user_agent').nullable();
        table.timestamp('created_at').notNullable().defaultTo(this.db.fn.now());

        table.index(['table_name', 'record_id']);
        table.index(['action']);
        table.index(['user_id']);
        table.index(['created_at']);
      });
    }
  }

  async log(
    tableName: string,
    recordId: string,
    action: AuditLog['action'],
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null,
    options: AuditOptions = {}
  ): Promise<AuditLog> {
    const changedFields = this.getChangedFields(oldData, newData);

    const insertData = {
      table_name: tableName,
      record_id: recordId,
      action,
      old_data: oldData ? JSON.stringify(oldData) : null,
      new_data: newData ? JSON.stringify(newData) : null,
      changed_fields: changedFields.length > 0 ? JSON.stringify(changedFields) : null,
      user_id: options.userId || null,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
      created_at: this.db.fn.now()
    };

    const [id] = await this.db('audit_logs').insert(insertData);

    return (await this.db('audit_logs').where('id', id).first()) as AuditLog;
  }

  async logInsert(
    tableName: string,
    recordId: string,
    newData: Record<string, any>,
    options: AuditOptions = {}
  ): Promise<AuditLog> {
    return this.log(tableName, recordId, 'INSERT', null, newData, options);
  }

  async logUpdate(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    options: AuditOptions = {}
  ): Promise<AuditLog> {
    return this.log(tableName, recordId, 'UPDATE', oldData, newData, options);
  }

  async logDelete(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    options: AuditOptions = {}
  ): Promise<AuditLog> {
    return this.log(tableName, recordId, 'DELETE', oldData, null, options);
  }

  async logSoftDelete(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    options: AuditOptions = {}
  ): Promise<AuditLog> {
    return this.log(tableName, recordId, 'SOFT_DELETE', oldData, { ...oldData, is_active: false }, options);
  }

  async logRestore(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    options: AuditOptions = {}
  ): Promise<AuditLog> {
    return this.log(tableName, recordId, 'RESTORE', oldData, { ...oldData, is_active: true }, options);
  }

  async findLogs(options: AuditQueryOptions = {}): Promise<AuditLog[]> {
    let query = this.db('audit_logs').select('*');

    if (options.tableName) {
      query = query.where('table_name', options.tableName);
    }

    if (options.recordId) {
      query = query.where('record_id', options.recordId);
    }

    if (options.action) {
      query = query.where('action', options.action);
    }

    if (options.userId) {
      query = query.where('user_id', options.userId);
    }

    if (options.fromDate) {
      query = query.where('created_at', '>=', options.fromDate);
    }

    if (options.toDate) {
      query = query.where('created_at', '<=', options.toDate);
    }

    query = query.orderBy('created_at', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
      if (options.offset) {
        query = query.offset(options.offset);
      }
    }

    return query as Promise<AuditLog[]>;
  }

  async getRecordHistory(tableName: string, recordId: string): Promise<AuditLog[]> {
    return this.findLogs({ tableName, recordId });
  }

  async getUserActivity(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.findLogs({ userId, limit });
  }

  async getRecentActivity(limit: number = 100): Promise<AuditLog[]> {
    return this.findLogs({ limit });
  }

  async getStats(): Promise<{
    totalLogs: number;
    byAction: Record<string, number>;
    byTable: Record<string, number>;
    recentUsers: string[];
  }> {
    const totalResult = await this.db('audit_logs').count('id as count').first();
    const totalLogs = Number(totalResult?.count) || 0;

    const byActionResult = await this.db('audit_logs')
      .select('action')
      .count('id as count')
      .groupBy('action');

    const byAction: Record<string, number> = {};
    for (const row of byActionResult) {
      byAction[row.action] = Number(row.count);
    }

    const byTableResult = await this.db('audit_logs')
      .select('table_name')
      .count('id as count')
      .groupBy('table_name');

    const byTable: Record<string, number> = {};
    for (const row of byTableResult) {
      byTable[row.table_name] = Number(row.count);
    }

    const recentUsersResult = await this.db('audit_logs')
      .select('user_id')
      .whereNotNull('user_id')
      .distinct()
      .orderBy('created_at', 'desc')
      .limit(10);

    const recentUsers = recentUsersResult.map(r => r.user_id);

    return { totalLogs, byAction, byTable, recentUsers };
  }

  async truncate(): Promise<void> {
    await this.db('audit_logs').truncate();
  }

  private getChangedFields(
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null
  ): string[] {
    if (!oldData || !newData) return [];

    const changedFields: string[] = [];

    for (const key of Object.keys(newData)) {
      if (key === 'updated_at') continue; // Skip timestamp
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}
