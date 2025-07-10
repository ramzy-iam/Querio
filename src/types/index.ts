// Core types for Querio ORM
export type FieldType = 'text' | 'uuid' | 'integer' | 'boolean' | 'timestamp' | 'decimal' | 'json';

export interface FieldDefinition {
  type: FieldType;
  nullable?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  unique?: boolean;
  column?: string; // Optional: maps entity field to database column name
}

export type FieldsDefinition = Record<string, FieldDefinition>;

// Utility function to convert camelCase to snake_case
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Utility function to convert snake_case to camelCase
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Utility function to get the database column name for a field
export function getColumnName(field: string, fieldDef?: FieldDefinition): string {
  if (fieldDef?.column) {
    return fieldDef.column;
  }
  return camelToSnake(field);
}

// Utility function to map entity fields to database columns
export function mapFieldsToColumns(
  fields: Record<string, any>, 
  fieldsDefinition: FieldsDefinition
): Record<string, any> {
  const mapped: Record<string, any> = {};
  Object.entries(fields).forEach(([field, value]) => {
    const columnName = getColumnName(field, fieldsDefinition[field]);
    mapped[columnName] = value;
  });
  return mapped;
}

// Utility function to map database columns back to entity fields
export function mapColumnsToFields<T>(
  row: Record<string, any>, 
  fieldsDefinition: FieldsDefinition
): T {
  const mapped: Record<string, any> = {};
  
  // Create a reverse mapping from column names to field names
  const columnToFieldMap: Record<string, string> = {};
  Object.entries(fieldsDefinition).forEach(([field, fieldDef]) => {
    const columnName = getColumnName(field, fieldDef);
    columnToFieldMap[columnName] = field;
  });
  
  // Map each column in the row back to its field name
  Object.entries(row).forEach(([column, value]) => {
    const fieldName = columnToFieldMap[column] || snakeToCamel(column);
    mapped[fieldName] = value;
  });
  
  return mapped as T;
}

// Utility function to map an array of database rows to entity objects
export function mapRowsToEntities<T>(
  rows: Record<string, any>[], 
  fieldsDefinition: FieldsDefinition
): T[] {
  return rows.map(row => mapColumnsToFields<T>(row, fieldsDefinition));
}

// Simple where condition type that's more permissive
export type WhereCondition<T = any> = {
  [K in keyof T]?: T[K] | {
    eq?: T[K];
    ne?: T[K];
    gt?: T[K];
    gte?: T[K];
    lt?: T[K];
    lte?: T[K];
    like?: string;
    ilike?: string;
    in?: T[K][];
    notIn?: T[K][];
    isNull?: boolean;
    isNotNull?: boolean;
  };
};

// Order by types
export type OrderDirection = 'asc' | 'desc';
export type OrderBy<T> = {
  [K in keyof T]?: OrderDirection;
} | keyof T;

// Select types for partial selection
export type SelectFields<T> = {
  [K in keyof T]?: boolean;
};

export type SelectedType<T, S extends SelectFields<T>> = {
  [K in keyof S as S[K] extends true ? K : never]: K extends keyof T ? T[K] : never;
};

// Join types
export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface JoinCondition {
  table: string;
  type: JoinType;
  on: string;
  alias?: string;
}

// SQL Building types
export interface SQLQuery {
  sql: string;
  params: unknown[];
}

export interface ModelDefinition<T extends FieldsDefinition> {
  table: string;
  fields: T;
}

// Query execution types
export interface QueryExecutor {
  execute<T>(query: SQLQuery): Promise<T[]>;
  executeOne<T>(query: SQLQuery): Promise<T | null>;
}
