/**
 * Test Types and Repository Definitions
 * 
 * This file defines all the types, models, and repositories used in tests
 * with proper type annotations for better type safety.
 */

import { 
  defineModel, 
  createRepository, 
  PostgreSQLAdapter,
  text, 
  uuid, 
  integer,
  boolean,
  timestamp,
  nullable,
  QueryBuilder,
  RepositoryType
} from '../src/index';

// Define entity types
export interface UserType {
  id: string;
  name: string;
  email: string;
  age: number | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AccountType {
  id: string;
  name: string;
  userId: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
}

// Define models
export const User = defineModel<UserType>({
  table: 'test_users',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    email: text({ unique: true }),
    age: nullable.integer(),
    isActive: boolean({ default: true }),
    createdAt: timestamp()
  }
});

export const Account = defineModel<AccountType>({
  table: 'test_accounts',
  fields: {
    id: uuid({ primaryKey: true }),
    name: text(),
    userId: uuid(),
    balance: integer({ default: 0 }),
    isActive: boolean({ default: true }),
    createdAt: timestamp()
  }
});

// Define repository scopes
export const userScopes = {
  active: () => (qb: QueryBuilder<UserType>) => qb.andWhere({ isActive: true }),
  byAge: (minAge: number) => (qb: QueryBuilder<UserType>) => qb.andWhere({ age: { gte: minAge } }),
  byEmail: (email: string) => (qb: QueryBuilder<UserType>) => qb.andWhere({ email }),
  inactive: () => (qb: QueryBuilder<UserType>) => qb.andWhere({ isActive: false }),
};

export const accountScopes = {
  active: () => (qb: QueryBuilder<AccountType>) => qb.andWhere({ isActive: true }),
  byUserId: (userId: string) => (qb: QueryBuilder<AccountType>) => qb.andWhere({ userId }),
  withBalance: (minBalance: number) => (qb: QueryBuilder<AccountType>) => qb.andWhere({ balance: { gte: minBalance } }),
  highBalance: () => (qb: QueryBuilder<AccountType>) => qb.andWhere({ balance: { gte: 10000 } }),
};

// Define repository types
export type UserRepository = RepositoryType<UserType, typeof userScopes>;
export type AccountRepository = RepositoryType<AccountType, typeof accountScopes>;

// Repository factory functions with proper types
export function createUserRepository(dbAdapter: PostgreSQLAdapter): UserRepository {
  return createRepository(User, {
    scopes: userScopes,
    executor: dbAdapter
  });
}

export function createAccountRepository(dbAdapter: PostgreSQLAdapter): AccountRepository {
  return createRepository(Account, {
    scopes: accountScopes,
    executor: dbAdapter
  });
}

// Combined factory function
export function createTestRepositories(dbAdapter: PostgreSQLAdapter) {
  const userRepository = createUserRepository(dbAdapter);
  const accountRepository = createAccountRepository(dbAdapter);
  
  return {
    userRepository,
    accountRepository
  };
}

// Export types for external use
export type TestRepositories = ReturnType<typeof createTestRepositories>;
