import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface GeoJsonOptions {
  level?: 'province' | 'regency' | 'district' | 'village';
  parentCode?: string;
  includeProperties?: string[];
  simplify?: boolean;
}

export class GeoJsonService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  async exportProvinces(options: GeoJsonOptions = {}): Promise<GeoJsonFeatureCollection> {
    let query = this.db('provinces').where('is_active', true);

    const provinces = await query.orderBy('code');

    const features: GeoJsonFeature[] = provinces.map(p => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point',
        coordinates: [0, 0] // Placeholder - in real app, would have actual coordinates
      },
      properties: {
        code: p.code,
        name: p.name,
        level: 'province',
        ...this.extractProperties(p, options.includeProperties)
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  async exportRegencies(provinceCode?: string, options: GeoJsonOptions = {}): Promise<GeoJsonFeatureCollection> {
    let query = this.db('regencies').where('is_active', true);

    if (provinceCode) {
      query = query.where('province_code', provinceCode);
    }

    const regencies = await query.orderBy('code');

    const features: GeoJsonFeature[] = regencies.map(r => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        code: r.code,
        name: r.name,
        province_code: r.province_code,
        level: 'regency',
        ...this.extractProperties(r, options.includeProperties)
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  async exportDistricts(regencyCode?: string, options: GeoJsonOptions = {}): Promise<GeoJsonFeatureCollection> {
    let query = this.db('districts').where('is_active', true);

    if (regencyCode) {
      query = query.where('regency_code', regencyCode);
    }

    const districts = await query.orderBy('code');

    const features: GeoJsonFeature[] = districts.map(d => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        code: d.code,
        name: d.name,
        regency_code: d.regency_code,
        level: 'district',
        ...this.extractProperties(d, options.includeProperties)
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  async exportVillages(districtCode?: string, options: GeoJsonOptions = {}): Promise<GeoJsonFeatureCollection> {
    let query = this.db('villages').where('is_active', true);

    if (districtCode) {
      query = query.where('district_code', districtCode);
    }

    const villages = await query.orderBy('code');

    const features: GeoJsonFeature[] = villages.map(v => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        code: v.code,
        name: v.name,
        district_code: v.district_code,
        level: 'village',
        ...this.extractProperties(v, options.includeProperties)
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  async exportHierarchyWithFullPath(): Promise<GeoJsonFeatureCollection> {
    const villages = await this.db('villages')
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
      .orderBy('villages.code');

    const features: GeoJsonFeature[] = villages.map(v => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        village_code: v.village_code,
        village_name: v.village_name,
        district_code: v.district_code,
        district_name: v.district_name,
        regency_code: v.regency_code,
        regency_name: v.regency_name,
        province_code: v.province_code,
        province_name: v.province_name,
        full_path: `${v.village_name}, ${v.district_name}, ${v.regency_name}, ${v.province_name}`
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  async exportChangesAsGeoJson(fromDate?: string, toDate?: string): Promise<GeoJsonFeatureCollection> {
    let query = this.db('region_changes');

    if (fromDate) {
      query = query.where('effective_date', '>=', fromDate);
    }
    if (toDate) {
      query = query.where('effective_date', '<=', toDate);
    }

    const changes = await query.orderBy('effective_date', 'desc');

    const features: GeoJsonFeature[] = changes.map(c => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point',
        coordinates: [0, 0]
      },
      properties: {
        id: c.id,
        change_type: c.change_type,
        old_code: c.old_code,
        new_code: c.new_code,
        old_name: c.old_name,
        new_name: c.new_name,
        effective_date: c.effective_date,
        reference_number: c.reference_number
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  private extractProperties(item: Record<string, any>, includeProperties?: string[]): Record<string, any> {
    if (!includeProperties) return {};

    const result: Record<string, any> = {};
    for (const prop of includeProperties) {
      if (item[prop] !== undefined) {
        result[prop] = item[prop];
      }
    }
    return result;
  }
}
