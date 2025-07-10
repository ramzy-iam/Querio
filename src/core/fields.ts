import { FieldDefinition } from '../types';

export function text(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'text',
    nullable: false,
    ...options
  };
}

export function uuid(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'primaryKey' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'uuid',
    nullable: false,
    ...options
  };
}

export function integer(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'primaryKey' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'integer',
    nullable: false,
    ...options
  };
}

export function boolean(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'boolean',
    nullable: false,
    ...options
  };
}

export function timestamp(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'timestamp',
    nullable: false,
    ...options
  };
}

export function decimal(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'decimal',
    nullable: false,
    ...options
  };
}

export function json(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): FieldDefinition {
  return {
    type: 'json',
    nullable: false,
    ...options
  };
}

export function enumField<T extends string>(
  enumValues: readonly T[], 
  options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique' | 'enumName'>> = {}
): FieldDefinition {
  return {
    type: 'enum',
    nullable: false,
    enumValues: [...enumValues],
    ...options
  };
}

// Shorthand for nullable fields
export const nullable = {
  text: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}) => text({ ...options, nullable: true }),
  uuid: (options: Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>> = {}) => uuid({ ...options, nullable: true }),
  integer: (options: Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>> = {}) => integer({ ...options, nullable: true }),
  boolean: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}) => boolean({ ...options, nullable: true }),
  timestamp: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}) => timestamp({ ...options, nullable: true }),
  decimal: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}) => decimal({ ...options, nullable: true }),
  json: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}) => json({ ...options, nullable: true }),
  enumField: <T extends string>(
    enumValues: readonly T[], 
    options: Partial<Pick<FieldDefinition, 'default' | 'unique' | 'enumName'>> = {}
  ) => enumField(enumValues, { ...options, nullable: true })
};
