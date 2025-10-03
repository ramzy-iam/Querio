// Core exports
export * from "./core/fields";
export * from "./core/model";
export * from "./core/relations";
export * from "./core/modelRegistry";
export * from "./core/schema";
export * from "./core/migration";
export * from "./types";

// Builder exports
export * from "./builder/QueryBuilder";

// Repository exports
export * from "./repository/Repository";

// Adapter exports
export * from "./adapters/postgres";
export type { LogLevel, LoggingConfig } from "./adapters/postgres";

// Re-export commonly used functions
export { defineModel, setGlobalExecutor } from "./core/model";

export { hasOne, hasMany, belongsTo, belongsToMany } from "./core/relations";

export {
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  decimal,
  json,
  enumField,
  nullable,
  uniqueConstraint,
  customConstraint,
  createConstraints,
} from "./core/fields";

// Logging functions
export {
  enableQueryLogging,
  disableQueryLogging,
  isQueryLoggingEnabled,
  ConsoleQueryLogger,
} from "./types";

// Type inference utilities
export type {
  InferEntityType,
  InferFieldType,
  InferNullableFieldType,
} from "./types";

export { createRepository } from "./repository/Repository";

export { PostgreSQLAdapter } from "./adapters/postgres";

// Version
export const version = "1.0.0";
