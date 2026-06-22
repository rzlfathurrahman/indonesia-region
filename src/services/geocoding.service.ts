import { Knex } from 'knex';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeoRegion {
  code: string;
  name: string;
  level: 'province' | 'regency' | 'district' | 'village';
  coordinates: Coordinates | null;
  parent_code?: string;
}

export interface GeocodingOptions {
  includeInactive?: boolean;
  radius?: number; // in km
}

export class GeocodingService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || require('../core/database').getDb();
  }

  async initGeoColumns(): Promise<void> {
    const hasLatProvince = await this.db.schema.hasColumn('provinces', 'latitude');
    if (!hasLatProvince) {
      await this.db.schema.alterTable('provinces', (table) => {
        table.decimal('latitude', 10, 7).nullable();
        table.decimal('longitude', 11, 7).nullable();
      });
    }

    const hasLatRegency = await this.db.schema.hasColumn('regencies', 'latitude');
    if (!hasLatRegency) {
      await this.db.schema.alterTable('regencies', (table) => {
        table.decimal('latitude', 10, 7).nullable();
        table.decimal('longitude', 11, 7).nullable();
      });
    }

    const hasLatDistrict = await this.db.schema.hasColumn('districts', 'latitude');
    if (!hasLatDistrict) {
      await this.db.schema.alterTable('districts', (table) => {
        table.decimal('latitude', 10, 7).nullable();
        table.decimal('longitude', 11, 7).nullable();
      });
    }

    const hasLatVillage = await this.db.schema.hasColumn('villages', 'latitude');
    if (!hasLatVillage) {
      await this.db.schema.alterTable('villages', (table) => {
        table.decimal('latitude', 10, 7).nullable();
        table.decimal('longitude', 11, 7).nullable();
      });
    }
  }

  async updateCoordinates(
    level: 'province' | 'regency' | 'district' | 'village',
    code: string,
    coordinates: Coordinates
  ): Promise<boolean> {
    const table = `${level}s`;
    const result = await this.db(table)
      .where('code', code)
      .update({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });

    return result > 0;
  }

  async bulkUpdateCoordinates(
    level: 'province' | 'regency' | 'district' | 'village',
    data: Array<{ code: string; coordinates: Coordinates }>
  ): Promise<number> {
    const table = `${level}s`;
    let updated = 0;

    await this.db.transaction(async (trx) => {
      for (const item of data) {
        await trx(table)
          .where('code', item.code)
          .update({
            latitude: item.coordinates.latitude,
            longitude: item.coordinates.longitude
          });
        updated++;
      }
    });

    return updated;
  }

  async getCoordinates(
    level: 'province' | 'regency' | 'district' | 'village',
    code: string
  ): Promise<Coordinates | null> {
    const table = `${level}s`;
    const result = await this.db(table)
      .where('code', code)
      .select('latitude', 'longitude')
      .first();

    if (!result || !result.latitude || !result.longitude) {
      return null;
    }

    return {
      latitude: Number(result.latitude),
      longitude: Number(result.longitude)
    };
  }

  async findNearby(
    level: 'province' | 'regency' | 'district' | 'village',
    coordinates: Coordinates,
    radiusKm: number = 50,
    options: GeocodingOptions = {}
  ): Promise<Array<GeoRegion & { distance_km: number }>> {
    const table = `${level}s`;
    const activeFilter = options.includeInactive ? '' : 'AND is_active = 1';

    // Haversine formula for distance calculation
    const query = `
      SELECT 
        code, name,
        latitude, longitude,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude))
          )
        ) AS distance_km
      FROM ${table}
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        ${activeFilter}
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
    `;

    const results = await this.db.raw(query, [
      coordinates.latitude,
      coordinates.longitude,
      coordinates.latitude,
      radiusKm
    ]);

    return results.map((r: any) => ({
      code: r.code,
      name: r.name,
      level,
      coordinates: {
        latitude: Number(r.latitude),
        longitude: Number(r.longitude)
      },
      distance_km: Number(r.distance_km)
    }));
  }

  async findNearbyAllLevels(
    coordinates: Coordinates,
    radiusKm: number = 50
  ): Promise<{
    provinces: Array<GeoRegion & { distance_km: number }>;
    regencies: Array<GeoRegion & { distance_km: number }>;
    districts: Array<GeoRegion & { distance_km: number }>;
    villages: Array<GeoRegion & { distance_km: number }>;
  }> {
    const [provinces, regencies, districts, villages] = await Promise.all([
      this.findNearby('province', coordinates, radiusKm),
      this.findNearby('regency', coordinates, radiusKm),
      this.findNearby('district', coordinates, radiusKm),
      this.findNearby('village', coordinates, radiusKm)
    ]);

    return { provinces, regencies, districts, villages };
  }

  async calculateDistance(
    coord1: Coordinates,
    coord2: Coordinates
  ): Promise<number> {
    const R = 6371; // Earth's radius in km

    const dLat = this.toRad(coord2.latitude - coord1.latitude);
    const dLon = this.toRad(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.latitude)) *
        Math.cos(this.toRad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async getBoundingBox(
    coordinates: Coordinates,
    radiusKm: number
  ): Promise<{ minLat: number; maxLat: number; minLng: number; maxLng: number }> {
    const latDelta = radiusKm / 111; // 1 degree latitude ≈ 111 km
    const lngDelta = radiusKm / (111 * Math.cos(this.toRad(coordinates.latitude)));

    return {
      minLat: coordinates.latitude - latDelta,
      maxLat: coordinates.latitude + latDelta,
      minLng: coordinates.longitude - lngDelta,
      maxLng: coordinates.longitude + lngDelta
    };
  }

  async getRegionBounds(
    level: 'province' | 'regency' | 'district' | 'village',
    code: string
  ): Promise<{ min: Coordinates; max: Coordinates } | null> {
    const table = `${level}s`;
    const result = await this.db(table)
      .where('code', code)
      .whereNotNull('latitude')
      .whereNotNull('longitude')
      .min('latitude as min_lat')
      .min('longitude as min_lng')
      .max('latitude as max_lat')
      .max('longitude as max_lng')
      .first();

    if (!result || !result.min_lat) return null;

    return {
      min: { latitude: Number(result.min_lat), longitude: Number(result.min_lng) },
      max: { latitude: Number(result.max_lat), longitude: Number(result.max_lng) }
    };
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
