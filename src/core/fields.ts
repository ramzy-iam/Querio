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

export function boolean(options: Partial<Pick<FieldDefinition, 'nullable' | 'default'>> = {}): FieldDefinition {
  return {
    type: 'boolean',
    nullable: false,
    ...options
  };
}

export function timestamp(options: Partial<Pick<FieldDefinition, 'nullable' | 'default'>> = {}): FieldDefinition {
  return {
    type: 'timestamp',
    nullable: false,
    ...options
  };
}

export function decimal(options: Partial<Pick<FieldDefinition, 'nullable' | 'default'>> = {}): FieldDefinition {
  return {
    type: 'decimal',
    nullable: false,
    ...options
  };
}

export function json(options: Partial<Pick<FieldDefinition, 'nullable' | 'default'>> = {}): FieldDefinition {
  return {
    type: 'json',
    nullable: false,
    ...options
  };
}

// Shorthand for nullable fields
export const nullable = {
  text: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}) => text({ ...options, nullable: true }),
  uuid: (options: Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>> = {}) => uuid({ ...options, nullable: true }),
  integer: (options: Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>> = {}) => integer({ ...options, nullable: true }),
  boolean: (options: Partial<Pick<FieldDefinition, 'default'>> = {}) => boolean({ ...options, nullable: true }),
  timestamp: (options: Partial<Pick<FieldDefinition, 'default'>> = {}) => timestamp({ ...options, nullable: true }),
  decimal: (options: Partial<Pick<FieldDefinition, 'default'>> = {}) => decimal({ ...options, nullable: true }),
  json: (options: Partial<Pick<FieldDefinition, 'default'>> = {}) => json({ ...options, nullable: true })
};
