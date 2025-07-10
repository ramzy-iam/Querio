import { QueryExecutor } from '../types';
import { QueryBuilder } from '../builder/QueryBuilder';
import { ModelInstance } from '../core/defineModel';

export type ScopeFunction<T> = (qb: QueryBuilder<T>) => QueryBuilder<T>;
export type ScopeFactory<T> = (...args: any[]) => ScopeFunction<T>;

export interface RepositoryScopes<T> {
  [scopeName: string]: ScopeFactory<T>;
}

// Type to convert scope factories into scope methods that return ScopedQueryBuilder
export type ScopeMethods<T, S extends RepositoryScopes<T>> = {
  [K in keyof S]: S[K] extends (...args: infer A) => any 
    ? (...args: A) => ScopedQueryBuilder<T> & ScopeMethods<T, S>
    : never;
};

// Enhanced ScopedQueryBuilder with scope methods
export type EnhancedScopedQueryBuilder<T, S extends RepositoryScopes<T>> = 
  ScopedQueryBuilder<T> & ScopeMethods<T, S>;

export class Repository<T = any, S extends RepositoryScopes<T> = any> {
  private model: ModelInstance<T>;
  private scopes: S;
  private executor: QueryExecutor;

  constructor(
    model: ModelInstance<T>,
    scopes: S,
    executor: QueryExecutor
  ) {
    this.model = model;
    this.scopes = scopes;
    this.executor = executor;
  }

  // Create a new scoped query builder with proper typing
  get scoped(): EnhancedScopedQueryBuilder<T, S> {
    const baseQueryBuilder = new QueryBuilder<T>(this.model.table, this.executor);
    return new ScopedQueryBuilder(baseQueryBuilder, this.scopes) as EnhancedScopedQueryBuilder<T, S>;
  }

  // Direct access to query builder methods (more reliable than model methods)
  where(condition: any): QueryBuilder<T> {
    return new QueryBuilder<T>(this.model.table, this.executor).where(condition);
  }

  select(fields: any): any {
    return new QueryBuilder<T>(this.model.table, this.executor).select(fields);
  }

  async getMany(): Promise<T[]> {
    return new QueryBuilder<T>(this.model.table, this.executor).getMany();
  }

  async getOne(): Promise<T | null> {
    return new QueryBuilder<T>(this.model.table, this.executor).getOne();
  }

  async pluck<K extends keyof T>(field: K): Promise<T[K][]> {
    return new QueryBuilder<T>(this.model.table, this.executor).pluck(field);
  }

  async count(): Promise<number> {
    return new QueryBuilder<T>(this.model.table, this.executor).count();
  }

  async update(data: Partial<T>): Promise<T[]> {
    return new QueryBuilder<T>(this.model.table, this.executor).update(data);
  }

  async delete(): Promise<T[]> {
    return new QueryBuilder<T>(this.model.table, this.executor).delete();
  }

  // Create a record
  async create(data: Partial<T>): Promise<T> {
    const queryBuilder = new QueryBuilder<T>(this.model.table, this.executor);
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
}

// Scoped query builder that can chain scope methods
export class ScopedQueryBuilder<T> {
  private queryBuilder: QueryBuilder<T>;
  private scopes: RepositoryScopes<T>;

  constructor(queryBuilder: QueryBuilder<T>, scopes: RepositoryScopes<T>) {
    this.queryBuilder = queryBuilder;
    this.scopes = scopes;
    
    // Dynamically add scope methods
    this.addScopeMethods();
  }

  private addScopeMethods(): void {
    Object.keys(this.scopes).forEach(scopeName => {
      (this as any)[scopeName] = (...args: any[]) => {
        const scopeFunction = this.scopes[scopeName](...args);
        this.queryBuilder = scopeFunction(this.queryBuilder);
        return this;
      };
    });
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

// Create a repository with scopes and proper typing
export function createRepository<T, S extends RepositoryScopes<T>>(
  model: ModelInstance<T>,
  config: {
    scopes: S;
    executor: QueryExecutor;
  }
): Repository<T, S> & ScopeMethods<T, S> {
  const repository = new Repository(model, config.scopes, config.executor);
  
  // Add dynamic scope methods to the repository
  Object.keys(config.scopes).forEach(scopeName => {
    (repository as any)[scopeName] = (...args: any[]) => {
      const scoped = repository.scoped;
      return (scoped as any)[scopeName](...args);
    };
  });
  
  return repository as Repository<T, S> & ScopeMethods<T, S>;
}
