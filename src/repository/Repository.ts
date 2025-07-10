import { QueryExecutor, WhereCondition } from '../types';
import { QueryBuilder } from '../builder/QueryBuilder';
import { ModelInstance } from '../core/defineModel';

export type ScopeFunction<T> = (qb: QueryBuilder<T>) => QueryBuilder<T>;
export type ScopeFactory<T> = (...args: any[]) => ScopeFunction<T>;

export interface RepositoryScopes<T> {
  [scopeName: string]: ScopeFactory<T>;
}

export class Repository<T = any> {
  private model: ModelInstance<T>;
  private scopes: RepositoryScopes<T>;
  private executor: QueryExecutor;

  constructor(
    model: ModelInstance<T>,
    scopes: RepositoryScopes<T>,
    executor: QueryExecutor
  ) {
    this.model = model;
    this.scopes = scopes;
    this.executor = executor;
  }

  // Create a new scoped query builder
  scoped(): ScopedQueryBuilder<T> {
    const baseQueryBuilder = new QueryBuilder<T>(this.model.table, this.executor, this.model.fields);
    return new ScopedQueryBuilder(baseQueryBuilder, this.scopes);
  }

  // Direct access to model methods
  where(condition: any): QueryBuilder<T> {
    return this.model.where(condition);
  }

  select(fields: any): any {
    return this.model.select(fields);
  }

  // Convenient methods with optional conditions
  async getMany(): Promise<T[]>;
  async getMany(condition: WhereCondition<T>): Promise<T[]>;
  async getMany(condition?: WhereCondition<T>): Promise<T[]> {
    if (condition) {
      return this.model.where(condition).getMany();
    }
    return this.model.getMany();
  }

  async getOne(): Promise<T | null>;
  async getOne(condition: WhereCondition<T>): Promise<T | null>;
  async getOne(condition?: WhereCondition<T>): Promise<T | null> {
    if (condition) {
      return this.model.where(condition).getOne();
    }
    return this.model.getOne();
  }

  async count(): Promise<number>;
  async count(condition: WhereCondition<T>): Promise<number>;
  async count(condition?: WhereCondition<T>): Promise<number> {
    if (condition) {
      return this.model.where(condition).count();
    }
    return this.model.count();
  }

  // Update and delete with optional conditions
  async update(data: Partial<T>): Promise<T[]>;
  async update(data: Partial<T>, condition: WhereCondition<T>): Promise<T[]>;
  async update(data: Partial<T>, condition?: WhereCondition<T>): Promise<T[]> {
    if (condition) {
      return this.model.where(condition).update(data);
    }
    return this.model.update(data);
  }

  async delete(): Promise<T[]>;
  async delete(condition: WhereCondition<T>): Promise<T[]>;
  async delete(condition?: WhereCondition<T>): Promise<T[]> {
    if (condition) {
      return this.model.where(condition).delete();
    }
    return this.model.delete();
  }

  // Create a record
  async create(data: Partial<T>): Promise<T> {
    const queryBuilder = new QueryBuilder<T>(this.model.table, this.executor, this.model.fields);
    const results = await queryBuilder.update(data); // This will be an INSERT in a real implementation
    return results[0];
  }

  // Bulk create
  async createMany(data: Partial<T>[]): Promise<T[]> {
    // This would need a proper bulk insert implementation
    const results: T[] = [];
    for (const item of data) {
      const result = await this.create(item);
      results.push(result);
    }
    return results;
  }

  // Additional convenient methods
  async findById(id: string | number): Promise<T | null> {
    return this.getOne({ id } as WhereCondition<T>);
  }

  async findBy(field: keyof T, value: any): Promise<T | null> {
    return this.getOne({ [field]: value } as WhereCondition<T>);
  }

  async findManyBy(field: keyof T, value: any): Promise<T[]> {
    return this.getMany({ [field]: value } as WhereCondition<T>);
  }

  async exists(condition: WhereCondition<T>): Promise<boolean> {
    const count = await this.count(condition);
    return count > 0;
  }
}

// Scoped query builder that can chain scope methods
export class ScopedQueryBuilder<T> {
  private queryBuilder: QueryBuilder<T>;

  constructor(queryBuilder: QueryBuilder<T>, _scopes: RepositoryScopes<T>) {
    this.queryBuilder = queryBuilder;
    // Note: scopes will be used when dynamic scope methods are implemented
  }

  // Standard query builder methods
  where(condition: any): this {
    this.queryBuilder = this.queryBuilder.where(condition);
    return this;
  }

  andWhere(condition: any): this {
    this.queryBuilder = this.queryBuilder.andWhere(condition);
    return this;
  }

  orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): this {
    this.queryBuilder = this.queryBuilder.orderBy(field, direction);
    return this;
  }

  limit(count: number): this {
    this.queryBuilder = this.queryBuilder.limit(count);
    return this;
  }

  offset(count: number): this {
    this.queryBuilder = this.queryBuilder.offset(count);
    return this;
  }

  select(fields: any): any {
    return this.queryBuilder.select(fields);
  }

  async getMany(): Promise<T[]> {
    return this.queryBuilder.getMany();
  }

  async getOne(): Promise<T | null> {
    return this.queryBuilder.getOne();
  }

  async pluck<K extends keyof T>(field: K): Promise<T[K][]> {
    return this.queryBuilder.pluck(field);
  }

  async count(): Promise<number> {
    return this.queryBuilder.count();
  }

  async update(data: Partial<T>): Promise<T[]> {
    return this.queryBuilder.update(data);
  }

  async delete(): Promise<T[]> {
    return this.queryBuilder.delete();
  }
}

// Create a repository with scopes
export function createRepository<T = any>(
  model: ModelInstance<T>,
  config: {
    scopes: RepositoryScopes<T>;
    executor: QueryExecutor;
  }
): Repository<T> {
  const repository = new Repository(model, config.scopes, config.executor);
  
  // TODO: Implement dynamic scope methods
  // This will be implemented when the scope system is fully developed
  
  return repository;
}
