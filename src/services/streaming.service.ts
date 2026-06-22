import { Knex } from 'knex';
import { Writable, Readable } from 'stream';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

export interface StreamingOptions {
  batchSize?: number;
  format?: 'json' | 'csv';
  compression?: 'gzip' | 'none';
  highWaterMark?: number;
}

export class StreamingService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || require('../core/database').getDb();
  }

  async streamProvinces(
    options: StreamingOptions = {},
    onData: (chunk: any[]) => Promise<void> | void
  ): Promise<void> {
    const { batchSize = 1000 } = options;

    const stream = this.db('provinces')
      .where('is_active', true)
      .orderBy('code')
      .stream({ highWaterMark: options.highWaterMark || 100 });

    let batch: any[] = [];

    for await (const row of stream) {
      batch.push(row);

      if (batch.length >= batchSize) {
        await onData(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onData(batch);
    }
  }

  async streamRegencies(
    onData: (chunk: any[]) => Promise<void> | void,
    options: StreamingOptions = {},
    provinceCode?: string
  ): Promise<void> {
    const { batchSize = 1000 } = options;

    let query = this.db('regencies').where('is_active', true);
    if (provinceCode) {
      query = query.where('province_code', provinceCode);
    }

    const stream = query.orderBy('code').stream({ highWaterMark: options.highWaterMark || 100 });

    let batch: any[] = [];

    for await (const row of stream) {
      batch.push(row);

      if (batch.length >= batchSize) {
        await onData(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onData(batch);
    }
  }

  async streamDistricts(
    onData: (chunk: any[]) => Promise<void> | void,
    options: StreamingOptions = {},
    regencyCode?: string
  ): Promise<void> {
    const { batchSize = 1000 } = options;

    let query = this.db('districts').where('is_active', true);
    if (regencyCode) {
      query = query.where('regency_code', regencyCode);
    }

    const stream = query.orderBy('code').stream({ highWaterMark: options.highWaterMark || 100 });

    let batch: any[] = [];

    for await (const row of stream) {
      batch.push(row);

      if (batch.length >= batchSize) {
        await onData(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onData(batch);
    }
  }

  async streamVillages(
    onData: (chunk: any[]) => Promise<void> | void,
    options: StreamingOptions = {},
    districtCode?: string
  ): Promise<void> {
    const { batchSize = 1000 } = options;

    let query = this.db('villages').where('is_active', true);
    if (districtCode) {
      query = query.where('district_code', districtCode);
    }

    const stream = query.orderBy('code').stream({ highWaterMark: options.highWaterMark || 100 });

    let batch: any[] = [];

    for await (const row of stream) {
      batch.push(row);

      if (batch.length >= batchSize) {
        await onData(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onData(batch);
    }
  }

  async streamHierarchy(
    options: StreamingOptions = {},
    onData: (chunk: any[]) => Promise<void> | void
  ): Promise<void> {
    const { batchSize = 500 } = options;

    const stream = this.db('villages')
      .join('districts', 'villages.district_code', 'districts.code')
      .join('regencies', 'districts.regency_code', 'regencies.code')
      .join('provinces', 'regencies.province_code', 'provinces.code')
      .where('villages.is_active', true)
      .where('districts.is_active', true)
      .where('regencies.is_active', true)
      .where('provinces.is_active', true)
      .select(
        'villages.code as village_code',
        'villages.name as village_name',
        'districts.code as district_code',
        'districts.name as district_name',
        'regencies.code as regency_code',
        'regencies.name as regency_name',
        'provinces.code as province_code',
        'provinces.name as province_name'
      )
      .orderBy('villages.code')
      .stream({ highWaterMark: options.highWaterMark || 100 });

    let batch: any[] = [];

    for await (const row of stream) {
      batch.push(row);

      if (batch.length >= batchSize) {
        await onData(batch);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await onData(batch);
    }
  }

  async exportStreamToFile(
    tableName: 'provinces' | 'regencies' | 'districts' | 'villages',
    filePath: string,
    options: StreamingOptions = {}
  ): Promise<{ rows: number; filePath: string }> {
    const { batchSize = 1000, format = 'csv' } = options;
    const fs = require('fs');

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath);
      let rowCount = 0;
      let isFirstBatch = true;

      const processBatch = async (batch: any[]) => {
        if (batch.length === 0) return;

        if (isFirstBatch && format === 'csv') {
          const headers = Object.keys(batch[0]).join(',');
          writeStream.write(headers + '\n');
          isFirstBatch = false;
        }

        for (const row of batch) {
          if (format === 'csv') {
            const values = Object.values(row).map(v => {
              const str = String(v ?? '');
              return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            });
            writeStream.write(values.join(',') + '\n');
          } else {
            writeStream.write(JSON.stringify(row) + '\n');
          }
          rowCount++;
        }
      };

      this.streamAll(tableName, { batchSize }, processBatch)
        .then(() => {
          writeStream.end();
          writeStream.on('finish', () => resolve({ rows: rowCount, filePath }));
          writeStream.on('error', reject);
        })
        .catch(reject);
    });
  }

  private async streamAll(
    tableName: 'provinces' | 'regencies' | 'districts' | 'villages',
    options: StreamingOptions,
    onData: (chunk: any[]) => Promise<void> | void
  ): Promise<void> {
    switch (tableName) {
      case 'provinces':
        return this.streamProvinces(options, onData);
      case 'regencies':
        return this.streamRegencies(onData, options, undefined);
      case 'districts':
        return this.streamDistricts(onData, options, undefined);
      case 'villages':
        return this.streamVillages(onData, options, undefined);
    }
  }
}
