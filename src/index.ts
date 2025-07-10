// Core exports
export * from './core/fields';
export * from './core/defineModel';
export * from './types';

// Builder exports
export * from './builder/QueryBuilder';

// Repository exports
export * from './repository/Repository';

// Adapter exports
export * from './adapters/postgres';

// Re-export commonly used functions
export { 
  defineModel, 
  setGlobalExecutor
} from './core/defineModel';

export { 
  text, 
  uuid, 
  integer, 
  boolean, 
  timestamp, 
  decimal, 
  json, 
  nullable 
} from './core/fields';

export { 
  createRepository 
} from './repository/Repository';

export { 
  PostgreSQLAdapter 
} from './adapters/postgres';

// Version
export const version = '1.0.0';
