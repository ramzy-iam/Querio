// Core types for Querio ORM
export type FieldType =
  | "text"
  | "uuid"
  | "integer"
  | "boolean"
  | "timestamp"
  | "decimal"
  | "json"
  | "enum";

// Pagination interfaces
export interface PaginationInput {
  page: number; // Page number (1-based)
  pageSize: number; // Number of items per page
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Relation loading types
export interface RelationLoadOptions {
  [relationName: string]: boolean | RelationLoadOptions;
}

// Options for find method with relation support
export interface FindOptions<T> {
  where?: WhereCondition<T>;
  select?: SelectFields<T>;
  orderBy?: { field: keyof T; direction?: "asc" | "desc" };
  limit?: number;
  offset?: number;
  relations?: RelationLoadOptions;
}

// Options for findOne method with relation support
export interface FindOneOptions<T> {
  where?: WhereCondition<T>;
  select?: SelectFields<T>;
  orderBy?: { field: keyof T; direction?: "asc" | "desc" };
  relations?: RelationLoadOptions;
}

// Pagination input with relation support
export interface FindPaginatedOptions<T> {
  where?: WhereCondition<T>;
  select?: SelectFields<T>;
  orderBy?: { field: keyof T; direction?: "asc" | "desc" };
  pagination: PaginationInput;
  relations?: RelationLoadOptions;
}

// Logging types
export interface QueryLogEntry {
  sql: string;
  params: unknown[];
  executionTime?: number;
  timestamp: Date;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "COUNT";
}

export interface QueryLogger {
  log(entry: QueryLogEntry): void;
}

// Default console logger
export class ConsoleQueryLogger implements QueryLogger {
  constructor(private showTimestamp: boolean = true) {}

  log(entry: QueryLogEntry): void {
    const timestamp = this.showTimestamp
      ? `[${entry.timestamp.toISOString()}] `
      : "";
    const executionTime = entry.executionTime
      ? ` (${entry.executionTime}ms)`
      : "";

    console.log(`${timestamp}🔍 ${entry.operation} Query${executionTime}:`);
    console.log(`   SQL: ${entry.sql}`);
    if (entry.params.length > 0) {
      console.log(`   Params: ${JSON.stringify(entry.params)}`);
    }
    console.log("");
  }
}

// Global logging configuration
let globalQueryLogger: QueryLogger | null = null;
let loggingEnabled = false;

export function enableQueryLogging(logger?: QueryLogger): void {
  loggingEnabled = true;
  globalQueryLogger = logger || new ConsoleQueryLogger();
}

export function disableQueryLogging(): void {
  loggingEnabled = false;
  globalQueryLogger = null;
}

export function isQueryLoggingEnabled(): boolean {
  return loggingEnabled;
}

export function getQueryLogger(): QueryLogger | null {
  return globalQueryLogger;
}

export interface FieldDefinition {
  type: FieldType;
  nullable?: boolean;
  default?: unknown;
  primaryKey?: boolean;
  unique?: boolean;
  column?: string; // Optional: maps entity field to database column name
  enumValues?: string[]; // For enum fields
  enumName?: string; // Custom enum type name in database
}

// Constraint definitions for table-level constraints
export interface UniqueConstraint {
  name?: string; // Optional constraint name
  fields: string[]; // Array of field names that together must be unique
}

export interface CustomConstraint {
  name: string; // Constraint name
  definition: string; // SQL constraint definition (e.g., "CHECK (age >= 0)")
}

export interface TableConstraints {
  unique?: UniqueConstraint[]; // Combined unique constraints
  custom?: CustomConstraint[]; // Custom SQL constraints
}

export type FieldsDefinition = Record<string, FieldDefinition>;

// Utility function to convert camelCase to snake_case
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Utility function to convert snake_case to camelCase
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Utility function to get the database column name for a field
export function getColumnName(
  field: string,
  fieldDef?: FieldDefinition
): string {
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
  return rows.map((row) => mapColumnsToFields<T>(row, fieldsDefinition));
}

// Base field condition type
export type FieldCondition<T, K extends keyof T> =
  | T[K]
  | {
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

// Enhanced where condition type with logical operators
export type WhereCondition<T = any> =
  | {
      [K in keyof T]?: FieldCondition<T, K>;
    }
  | {
      AND?: WhereCondition<T>[];
      OR?: WhereCondition<T>[];
    }
  | ({
      [K in keyof T]?: FieldCondition<T, K>;
    } & {
      AND?: WhereCondition<T>[];
    })
  | ({
      [K in keyof T]?: FieldCondition<T, K>;
    } & {
      OR?: WhereCondition<T>[];
    });

// Order by types
export type OrderDirection = "asc" | "desc";
export type OrderBy<T> =
  | {
      [K in keyof T]?: OrderDirection;
    }
  | keyof T;

// Select types for partial selection
export type SelectFields<T> = {
  [K in keyof T]?: boolean;
};

export type SelectedType<T, S extends SelectFields<T>> = {
  [K in keyof S as S[K] extends true ? K : never]: K extends keyof T
    ? T[K]
    : never;
};

// Join types
export type JoinType = "inner" | "left" | "right" | "full";

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
  constraints?: TableConstraints; // Table-level constraints
}

// Query execution types
export interface QueryExecutor {
  execute<T>(query: SQLQuery): Promise<T[]>;
  executeOne<T>(query: SQLQuery): Promise<T | null>;
}

// Repository type utilities for creating strongly typed specific repositories
export type RepositoryType<
  T,
  S extends Record<string, any> = {}
> = import("../repository/Repository").Repository<T, S> &
  import("../repository/Repository").ScopeMethods<T, S>;

// Utility type to infer the entity type from a repository
export type EntityFromRepository<R> = R extends RepositoryType<infer T, any>
  ? T
  : never;

// Utility type to infer the scopes type from a repository
export type ScopesFromRepository<R> = R extends RepositoryType<any, infer S>
  ? S
  : never;

// Type for the createRepository function result
export type CreatedRepository<
  T,
  S extends Record<string, any> = {}
> = RepositoryType<T, S>;
