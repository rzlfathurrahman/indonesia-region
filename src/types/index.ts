export interface Province {
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Regency {
  code: string;
  province_code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface District {
  code: string;
  regency_code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Village {
  code: string;
  district_code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegionChange {
  id: number;
  change_type: 'SPLIT' | 'MERGE' | 'RENAME' | 'TRANSFER';
  old_code: string;
  new_code: string | null;
  old_parent_code: string | null;
  new_parent_code: string | null;
  old_name: string;
  new_name: string | null;
  effective_date: string;
  reference_number?: string | null;
  description?: string | null;
  created_at: string;
}

export type RegionLevel = 'province' | 'regency' | 'district' | 'village';

export interface SyncResult {
  level: RegionLevel;
  added: number;
  updated: number;
  deactivated: number;
  changes: RegionChange[];
}

export interface QueryOptions {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProvinceWithRegencies extends Province {
  regencies?: Regency[];
}

export interface RegencyWithDistricts extends Regency {
  districts?: District[];
}

export interface DistrictWithVillages extends District {
  villages?: Village[];
}
