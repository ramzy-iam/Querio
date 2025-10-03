import { FieldDefinition, UniqueConstraint, CustomConstraint, TableConstraints } from '../types';

// Specific field definition types for better inference
type TextFieldDef = { type: 'text'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type UuidFieldDef = { type: 'uuid'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>>;
type IntegerFieldDef = { type: 'integer'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>>;
type BooleanFieldDef = { type: 'boolean'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type TimestampFieldDef = { type: 'timestamp'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type DecimalFieldDef = { type: 'decimal'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type JsonFieldDef = { type: 'json'; nullable: false } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;

type NullableTextFieldDef = { type: 'text'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type NullableUuidFieldDef = { type: 'uuid'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>>;
type NullableIntegerFieldDef = { type: 'integer'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>>;
type NullableBooleanFieldDef = { type: 'boolean'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type NullableTimestampFieldDef = { type: 'timestamp'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type NullableDecimalFieldDef = { type: 'decimal'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;
type NullableJsonFieldDef = { type: 'json'; nullable: true } & Partial<Pick<FieldDefinition, 'default' | 'unique'>>;

export function text(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): TextFieldDef {
  return {
    type: 'text',
    nullable: false,
    ...options
  } as TextFieldDef;
}

export function uuid(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'primaryKey' | 'unique'>> = {}): UuidFieldDef {
  return {
    type: 'uuid',
    nullable: false,
    ...options
  } as UuidFieldDef;
}

export function integer(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'primaryKey' | 'unique'>> = {}): IntegerFieldDef {
  return {
    type: 'integer',
    nullable: false,
    ...options
  } as IntegerFieldDef;
}

export function boolean(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): BooleanFieldDef {
  return {
    type: 'boolean',
    nullable: false,
    ...options
  } as BooleanFieldDef;
}

export function timestamp(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): TimestampFieldDef {
  return {
    type: 'timestamp',
    nullable: false,
    ...options
  } as TimestampFieldDef;
}

export function decimal(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): DecimalFieldDef {
  return {
    type: 'decimal',
    nullable: false,
    ...options
  } as DecimalFieldDef;
}

export function json(options: Partial<Pick<FieldDefinition, 'nullable' | 'default' | 'unique'>> = {}): JsonFieldDef {
  return {
    type: 'json',
    nullable: false,
    ...options
  } as JsonFieldDef;
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
  text: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}): NullableTextFieldDef => ({
    type: 'text',
    nullable: true,
    ...options
  } as NullableTextFieldDef),
  
  uuid: (options: Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>> = {}): NullableUuidFieldDef => ({
    type: 'uuid',
    nullable: true,
    ...options
  } as NullableUuidFieldDef),
  
  integer: (options: Partial<Pick<FieldDefinition, 'default' | 'primaryKey' | 'unique'>> = {}): NullableIntegerFieldDef => ({
    type: 'integer',
    nullable: true,
    ...options
  } as NullableIntegerFieldDef),
  
  boolean: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}): NullableBooleanFieldDef => ({
    type: 'boolean',
    nullable: true,
    ...options
  } as NullableBooleanFieldDef),
  
  timestamp: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}): NullableTimestampFieldDef => ({
    type: 'timestamp',
    nullable: true,
    ...options
  } as NullableTimestampFieldDef),
  
  decimal: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}): NullableDecimalFieldDef => ({
    type: 'decimal',
    nullable: true,
    ...options
  } as NullableDecimalFieldDef),
  
  json: (options: Partial<Pick<FieldDefinition, 'default' | 'unique'>> = {}): NullableJsonFieldDef => ({
    type: 'json',
    nullable: true,
    ...options
  } as NullableJsonFieldDef),
  
  enumField: <T extends string>(
    enumValues: readonly T[], 
    options: Partial<Pick<FieldDefinition, 'default' | 'unique' | 'enumName'>> = {}
  ) => enumField(enumValues, { ...options, nullable: true })
};

// Constraint helper functions
export function uniqueConstraint(fields: string[], name?: string): UniqueConstraint {
  return {
    fields,
    ...(name && { name })
  };
}

export function customConstraint(name: string, definition: string): CustomConstraint {
  return {
    name,
    definition
  };
}

// Helper to create table constraints
export function createConstraints(options: {
  unique?: UniqueConstraint[];
  custom?: CustomConstraint[];
}): TableConstraints {
  return {
    ...(options.unique && { unique: options.unique }),
    ...(options.custom && { custom: options.custom })
  };
}
