import { Knex } from 'knex';
import { getDb } from '../core/database';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidateOptions {
  checkParent?: boolean;
  allowInactive?: boolean;
}

export class ValidationService {
  private db: Knex;

  constructor(db?: Knex) {
    this.db = db || getDb();
  }

  validateCode(code: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!code || typeof code !== 'string') {
      errors.push({ field: 'code', message: 'Code is required', code: 'REQUIRED' });
      return { valid: false, errors };
    }

    const trimmed = code.trim();
    if (trimmed.length === 0) {
      errors.push({ field: 'code', message: 'Code cannot be empty', code: 'EMPTY' });
      return { valid: false, errors };
    }

    if (!/^\d+$/.test(trimmed)) {
      errors.push({ field: 'code', message: 'Code must contain only digits', code: 'INVALID_FORMAT' });
    }

    const validLengths = [2, 4, 7, 10];
    if (!validLengths.includes(trimmed.length)) {
      errors.push({
        field: 'code',
        message: `Code length must be 2, 4, 7, or 10 digits. Got ${trimmed.length}`,
        code: 'INVALID_LENGTH'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  async validateHierarchy(code: string, options: ValidateOptions = {}): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const codeValidation = this.validateCode(code);

    if (!codeValidation.valid) {
      return codeValidation;
    }

    const trimmed = code.trim();
    const codeLen = trimmed.length;

    // Validate parent exists
    if (options.checkParent !== false) {
      if (codeLen === 10) {
        // Village - check district exists
        const district = await this.db('districts')
          .where('code', trimmed.substring(0, 7))
          .first();
        if (!district) {
          errors.push({
            field: 'district_code',
            message: `Parent district ${trimmed.substring(0, 7)} not found`,
            code: 'PARENT_NOT_FOUND'
          });
        } else if (!options.allowInactive && !district.is_active) {
          errors.push({
            field: 'district_code',
            message: `Parent district ${trimmed.substring(0, 7)} is inactive`,
            code: 'PARENT_INACTIVE'
          });
        }
      }

      if (codeLen >= 7) {
        // District - check regency exists
        const regency = await this.db('regencies')
          .where('code', trimmed.substring(0, 4))
          .first();
        if (!regency) {
          errors.push({
            field: 'regency_code',
            message: `Parent regency ${trimmed.substring(0, 4)} not found`,
            code: 'PARENT_NOT_FOUND'
          });
        } else if (!options.allowInactive && !regency.is_active) {
          errors.push({
            field: 'regency_code',
            message: `Parent regency ${trimmed.substring(0, 4)} is inactive`,
            code: 'PARENT_INACTIVE'
          });
        }
      }

      if (codeLen >= 4) {
        // Regency - check province exists
        const province = await this.db('provinces')
          .where('code', trimmed.substring(0, 2))
          .first();
        if (!province) {
          errors.push({
            field: 'province_code',
            message: `Parent province ${trimmed.substring(0, 2)} not found`,
            code: 'PARENT_NOT_FOUND'
          });
        } else if (!options.allowInactive && !province.is_active) {
          errors.push({
            field: 'province_code',
            message: `Parent province ${trimmed.substring(0, 2)} is inactive`,
            code: 'PARENT_INACTIVE'
          });
        }
      }
    }

    // Check uniqueness
    const table = this.getTableByCodeLength(codeLen);
    if (table) {
      const existing = await this.db(table).where('code', trimmed).first();
      if (existing) {
        errors.push({
          field: 'code',
          message: `Code ${trimmed} already exists`,
          code: 'DUPLICATE'
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateName(name: string, level: 'province' | 'regency' | 'district' | 'village'): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!name || typeof name !== 'string') {
      errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' });
      return { valid: false, errors };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      errors.push({ field: 'name', message: 'Name cannot be empty', code: 'EMPTY' });
      return { valid: false, errors };
    }

    if (trimmed.length > 255) {
      errors.push({ field: 'name', message: 'Name too long (max 255 characters)', code: 'TOO_LONG' });
    }

    // Check for duplicate name at same level
    const table = `${level}s`;
    const existing = await this.db(table)
      .where('name', trimmed)
      .where('is_active', true)
      .first();

    if (existing) {
      errors.push({
        field: 'name',
        message: `Name "${trimmed}" already exists at ${level} level`,
        code: 'DUPLICATE_NAME'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  async validateParent(parentCode: string, childLevel: 'regency' | 'district' | 'village'): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    const expectedLength = childLevel === 'regency' ? 2 : childLevel === 'district' ? 4 : 7;
    const table = this.getTableByCodeLength(expectedLength);

    if (!table) {
      errors.push({ field: 'parent_code', message: 'Invalid parent level', code: 'INVALID_LEVEL' });
      return { valid: false, errors };
    }

    const parent = await this.db(table).where('code', parentCode).first();
    if (!parent) {
      errors.push({
        field: 'parent_code',
        message: `Parent ${childLevel === 'regency' ? 'province' : childLevel === 'district' ? 'regency' : 'district'} ${parentCode} not found`,
        code: 'PARENT_NOT_FOUND'
      });
    } else if (!parent.is_active) {
      errors.push({
        field: 'parent_code',
        message: `Parent is inactive`,
        code: 'PARENT_INACTIVE'
      });
    }

    return { valid: errors.length === 0, errors };
  }

  private getTableByCodeLength(codeLen: number): string | null {
    switch (codeLen) {
      case 2: return 'provinces';
      case 4: return 'regencies';
      case 7: return 'districts';
      case 10: return 'villages';
      default: return null;
    }
  }

  getLevelByCode(code: string): 'province' | 'regency' | 'district' | 'village' | null {
    switch (code.length) {
      case 2: return 'province';
      case 4: return 'regency';
      case 7: return 'district';
      case 10: return 'village';
      default: return null;
    }
  }

  getParentCode(code: string): string | null {
    const len = code.length;
    if (len === 10) return code.substring(0, 7);
    if (len === 7) return code.substring(0, 4);
    if (len === 4) return code.substring(0, 2);
    return null;
  }
}
