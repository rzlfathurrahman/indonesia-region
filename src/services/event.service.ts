import { EventEmitter } from 'events';
import { Knex } from 'knex';
import { getDb } from '../core/database';
import { Province, Regency, District, Village, RegionChange } from '../types';

export type EventType =
  | 'province:created'
  | 'province:updated'
  | 'province:deleted'
  | 'regency:created'
  | 'regency:updated'
  | 'regency:deleted'
  | 'district:created'
  | 'district:updated'
  | 'district:deleted'
  | 'village:created'
  | 'village:updated'
  | 'village:deleted'
  | 'change:recorded'
  | 'sync:completed';

export interface WilayahEvent<T = any> {
  type: EventType;
  data: T;
  timestamp: Date;
}

export type EventHandler<T = any> = (event: WilayahEvent<T>) => void | Promise<void>;

export class EventService extends EventEmitter {
  private db: Knex;

  constructor(db?: Knex) {
    super();
    this.db = db || getDb();
  }

  async emitProvinceCreated(data: Province): Promise<void> {
    this.emit('province:created', this.createEvent('province:created', data));
  }

  async emitProvinceUpdated(data: Province): Promise<void> {
    this.emit('province:updated', this.createEvent('province:updated', data));
  }

  async emitProvinceDeleted(code: string): Promise<void> {
    this.emit('province:deleted', this.createEvent('province:deleted', { code }));
  }

  async emitRegencyCreated(data: Regency): Promise<void> {
    this.emit('regency:created', this.createEvent('regency:created', data));
  }

  async emitRegencyUpdated(data: Regency): Promise<void> {
    this.emit('regency:updated', this.createEvent('regency:updated', data));
  }

  async emitRegencyDeleted(code: string): Promise<void> {
    this.emit('regency:deleted', this.createEvent('regency:deleted', { code }));
  }

  async emitDistrictCreated(data: District): Promise<void> {
    this.emit('district:created', this.createEvent('district:created', data));
  }

  async emitDistrictUpdated(data: District): Promise<void> {
    this.emit('district:updated', this.createEvent('district:updated', data));
  }

  async emitDistrictDeleted(code: string): Promise<void> {
    this.emit('district:deleted', this.createEvent('district:deleted', { code }));
  }

  async emitVillageCreated(data: Village): Promise<void> {
    this.emit('village:created', this.createEvent('village:created', data));
  }

  async emitVillageUpdated(data: Village): Promise<void> {
    this.emit('village:updated', this.createEvent('village:updated', data));
  }

  async emitVillageDeleted(code: string): Promise<void> {
    this.emit('village:deleted', this.createEvent('village:deleted', { code }));
  }

  async emitChangeRecorded(data: RegionChange): Promise<void> {
    this.emit('change:recorded', this.createEvent('change:recorded', data));
  }

  async emitSyncCompleted(results: any[]): Promise<void> {
    this.emit('sync:completed', this.createEvent('sync:completed', { results }));
  }

  private createEvent<T>(type: EventType, data: T): WilayahEvent<T> {
    return {
      type,
      data,
      timestamp: new Date()
    };
  }

  onEvent<T>(type: EventType, handler: EventHandler<T>): void {
    this.on(type, handler);
  }

  offEvent<T>(type: EventType, handler: EventHandler<T>): void {
    this.off(type, handler);
  }

  onceEvent<T>(type: EventType, handler: EventHandler<T>): void {
    this.once(type, handler);
  }
}
