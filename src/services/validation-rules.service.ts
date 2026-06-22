import { Knex } from 'knex';

export type ValidationRuleType =
  | 'required'
  | 'string'
  | 'number'
  | 'boolean'
  | 'email'
  | 'phone'
  | 'code'
  | 'codeLength'
  | 'pattern'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'in'
  | 'custom';

export interface ValidationRule {
  type: ValidationRuleType;
  value?: any;
  message?: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}

export interface FieldValidationRules {
  [fieldName: string]: ValidationRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  value?: any;
}

export class ValidationRulesService {
  private db: Knex;
  private customRules: Map<string, (value: any) => boolean | Promise<boolean>> = new Map();

  constructor(db?: Knex) {
    this.db = db || require('../core/database').getDb();
  }

  // Built-in validators
  validateRequired(value: any): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  validateString(value: any): boolean {
    return typeof value === 'string';
  }

  validateNumber(value: any): boolean {
    return typeof value === 'number' || !isNaN(Number(value));
  }

  validateBoolean(value: any): boolean {
    return typeof value === 'boolean' || value === 'true' || value === 'false' || value === 0 || value === 1;
  }

  validateEmail(value: any): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  validatePhone(value: any): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(value);
  }

  validateCode(value: any): boolean {
    return /^\d{2,10}$/.test(value);
  }

  validateCodeLength(value: any, length: number): boolean {
    return typeof value === 'string' && value.length === length && /^\d+$/.test(value);
  }

  validatePattern(value: any, pattern: RegExp): boolean {
    return pattern.test(value);
  }

  validateMinLength(value: any, minLength: number): boolean {
    return typeof value === 'string' && value.length >= minLength;
  }

  validateMaxLength(value: any, maxLength: number): boolean {
    return typeof value === 'string' && value.length <= maxLength;
  }

  validateMin(value: any, min: number): boolean {
    return Number(value) >= min;
  }

  validateMax(value: any, max: number): boolean {
    return Number(value) <= max;
  }

  validateIn(value: any, allowedValues: any[]): boolean {
    return allowedValues.includes(value);
  }

  // Register custom validation rule
  registerCustomRule(name: string, validator: (value: any) => boolean | Promise<boolean>): void {
    this.customRules.set(name, validator);
  }

  // Validate a single value against rules
  async validateValue(value: any, rules: ValidationRule[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      let isValid = false;

      switch (rule.type) {
        case 'required':
          isValid = this.validateRequired(value);
          break;
        case 'string':
          isValid = this.validateString(value);
          break;
        case 'number':
          isValid = this.validateNumber(value);
          break;
        case 'boolean':
          isValid = this.validateBoolean(value);
          break;
        case 'email':
          isValid = this.validateEmail(value);
          break;
        case 'phone':
          isValid = this.validatePhone(value);
          break;
        case 'code':
          isValid = this.validateCode(value);
          break;
        case 'codeLength':
          isValid = this.validateCodeLength(value, rule.value);
          break;
        case 'pattern':
          isValid = this.validatePattern(value, rule.value);
          break;
        case 'minLength':
          isValid = this.validateMinLength(value, rule.value);
          break;
        case 'maxLength':
          isValid = this.validateMaxLength(value, rule.value);
          break;
        case 'min':
          isValid = this.validateMin(value, rule.value);
          break;
        case 'max':
          isValid = this.validateMax(value, rule.value);
          break;
        case 'in':
          isValid = this.validateIn(value, rule.value);
          break;
        case 'custom':
          if (rule.validator) {
            isValid = await rule.validator(value);
          } else if (this.customRules.has(rule.value)) {
            isValid = await this.customRules.get(rule.value)!(value);
          }
          break;
      }

      if (!isValid) {
        errors.push({
          field: '',
          rule: rule.type,
          message: rule.message || `Validation failed for rule: ${rule.type}`,
          value
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Validate an object against field rules
  async validateObject(data: Record<string, any>, rules: FieldValidationRules): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field];
      const result = await this.validateValue(value, fieldRules);

      if (!result.valid) {
        errors.push(
          ...result.errors.map(e => ({
            ...e,
            field
          }))
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Predefined validation schemas
  getProvinceValidationRules(): FieldValidationRules {
    return {
      code: [
        { type: 'required', message: 'Code is required' },
        { type: 'code', message: 'Code must be numeric' },
        { type: 'codeLength', value: 2, message: 'Province code must be 2 digits' }
      ],
      name: [
        { type: 'required', message: 'Name is required' },
        { type: 'string', message: 'Name must be a string' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
        { type: 'maxLength', value: 255, message: 'Name must not exceed 255 characters' }
      ],
      is_active: [
        { type: 'boolean', message: 'is_active must be a boolean' }
      ]
    };
  }

  getRegencyValidationRules(): FieldValidationRules {
    return {
      code: [
        { type: 'required', message: 'Code is required' },
        { type: 'code', message: 'Code must be numeric' },
        { type: 'codeLength', value: 4, message: 'Regency code must be 4 digits' }
      ],
      province_code: [
        { type: 'required', message: 'Province code is required' },
        { type: 'codeLength', value: 2, message: 'Province code must be 2 digits' }
      ],
      name: [
        { type: 'required', message: 'Name is required' },
        { type: 'string', message: 'Name must be a string' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
        { type: 'maxLength', value: 255, message: 'Name must not exceed 255 characters' }
      ],
      is_active: [
        { type: 'boolean', message: 'is_active must be a boolean' }
      ]
    };
  }

  getDistrictValidationRules(): FieldValidationRules {
    return {
      code: [
        { type: 'required', message: 'Code is required' },
        { type: 'code', message: 'Code must be numeric' },
        { type: 'codeLength', value: 7, message: 'District code must be 7 digits' }
      ],
      regency_code: [
        { type: 'required', message: 'Regency code is required' },
        { type: 'codeLength', value: 4, message: 'Regency code must be 4 digits' }
      ],
      name: [
        { type: 'required', message: 'Name is required' },
        { type: 'string', message: 'Name must be a string' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
        { type: 'maxLength', value: 255, message: 'Name must not exceed 255 characters' }
      ],
      is_active: [
        { type: 'boolean', message: 'is_active must be a boolean' }
      ]
    };
  }

  getVillageValidationRules(): FieldValidationRules {
    return {
      code: [
        { type: 'required', message: 'Code is required' },
        { type: 'code', message: 'Code must be numeric' },
        { type: 'codeLength', value: 10, message: 'Village code must be 10 digits' }
      ],
      district_code: [
        { type: 'required', message: 'District code is required' },
        { type: 'codeLength', value: 7, message: 'District code must be 7 digits' }
      ],
      name: [
        { type: 'required', message: 'Name is required' },
        { type: 'string', message: 'Name must be a string' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
        { type: 'maxLength', value: 255, message: 'Name must not exceed 255 characters' }
      ],
      is_active: [
        { type: 'boolean', message: 'is_active must be a boolean' }
      ]
    };
  }

  // Validate hierarchy
  async validateHierarchy(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const codeLen = code.length;

    if (![2, 4, 7, 10].includes(codeLen)) {
      errors.push({
        field: 'code',
        rule: 'codeLength',
        message: 'Code must be 2, 4, 7, or 10 digits',
        value: code
      });
      return { valid: false, errors };
    }

    // Check parent exists
    if (codeLen >= 4) {
      const parentExists = await this.db('provinces')
        .where('code', code.substring(0, 2))
        .first();
      if (!parentExists) {
        errors.push({
          field: 'province_code',
          rule: 'exists',
          message: `Province ${code.substring(0, 2)} does not exist`
        });
      }
    }

    if (codeLen >= 7) {
      const parentExists = await this.db('regencies')
        .where('code', code.substring(0, 4))
        .first();
      if (!parentExists) {
        errors.push({
          field: 'regency_code',
          rule: 'exists',
          message: `Regency ${code.substring(0, 4)} does not exist`
        });
      }
    }

    if (codeLen >= 10) {
      const parentExists = await this.db('districts')
        .where('code', code.substring(0, 7))
        .first();
      if (!parentExists) {
        errors.push({
          field: 'district_code',
          rule: 'exists',
          message: `District ${code.substring(0, 7)} does not exist`
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
