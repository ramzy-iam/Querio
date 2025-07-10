import { QueryExecutor, SelectFields, SelectedType, WhereCondition } from '../types';
import { QueryBuilder, SelectQueryBuilder } from '../builder/QueryBuilder';
import { ModelInstance } from '../core/defineModel';

export type ScopeFunction<T> = (qb: QueryBuilder<T>) => QueryBuilder<T>;
export type ScopeFactory<T> = (...args: any[]) => ScopeFunction<T>;

export interface RepositoryScopes<T> {
  [scopeName: string]: ScopeFactory<T>;
}

// Pagination interfaces
export interface PaginationInput {
  page: number;        // Page number (1-based)
  pageSize: number;    // Number of items per page
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

  select<S extends SelectFields<T>>(fields: S): SelectQueryBuilder<T, S> {
    return new QueryBuilder<T>(this.model.table, this.executor).select(fields);
  }

  // Enhanced getMany with options
  async getMany(): Promise<T[]>;
  async getMany<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
  }): Promise<SelectedType<T, S>[]>;
  async getMany<S extends SelectFields<T>>(options?: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
  }): Promise<T[] | SelectedType<T, S>[]> {
    let qb = new QueryBuilder<T>(this.model.table, this.executor);
    
    if (options) {
      if (options.where) {
        qb = qb.where(options.where);
      }
      if (options.orderBy) {
        qb = qb.orderBy(options.orderBy.field, options.orderBy.direction);
      }
      if (options.limit) {
        qb = qb.limit(options.limit);
      }
      if (options.offset) {
        qb = qb.offset(options.offset);
      }
      if (options.select) {
        return qb.select(options.select).getMany() as Promise<SelectedType<T, S>[]>;
      }
    }
    
    return qb.getMany();
  }

  // Paginated getMany methods
  async getManyPaginated(options: {
    where?: WhereCondition<T>;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
    pagination: PaginationInput;
  }): Promise<PaginationResult<T>>;
  async getManyPaginated<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
    pagination: PaginationInput;
  }): Promise<PaginationResult<SelectedType<T, S>>>;
  async getManyPaginated<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
    pagination: PaginationInput;
  }): Promise<PaginationResult<T> | PaginationResult<SelectedType<T, S>>> {
    const { pagination } = options;
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Build base query for counting
    let countQb = new QueryBuilder<T>(this.model.table, this.executor);
    if (options.where) {
      countQb = countQb.where(options.where);
    }
    
    // Get total count
    const totalItems = await countQb.count();
    const totalPages = Math.ceil(totalItems / pagination.pageSize);

    // Build query for data
    let dataQb = new QueryBuilder<T>(this.model.table, this.executor);
    if (options.where) {
      dataQb = dataQb.where(options.where);
    }
    if (options.orderBy) {
      dataQb = dataQb.orderBy(options.orderBy.field, options.orderBy.direction);
    }
    
    dataQb = dataQb.limit(pagination.pageSize).offset(offset);

    // Execute query
    let data: any;
    if (options.select) {
      data = await dataQb.select(options.select).getMany();
    } else {
      data = await dataQb.getMany();
    }

    // Build pagination result
    const paginationResult = {
      data,
      pagination: {
        currentPage: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
      },
    };

    return paginationResult;
  }

  // Enhanced getOne with options
  async getOne(): Promise<T | null>;
  async getOne<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
  }): Promise<SelectedType<T, S> | null>;
  async getOne<S extends SelectFields<T>>(options?: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: 'asc' | 'desc' };
  }): Promise<T | SelectedType<T, S> | null> {
    let qb = new QueryBuilder<T>(this.model.table, this.executor);
    
    if (options) {
      if (options.where) {
        qb = qb.where(options.where);
      }
      if (options.orderBy) {
        qb = qb.orderBy(options.orderBy.field, options.orderBy.direction);
      }
      if (options.select) {
        return qb.select(options.select).getOne() as Promise<SelectedType<T, S> | null>;
      }
    }
    
    return qb.getOne();
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

  select<S extends SelectFields<T>>(fields: S): ScopedSelectQueryBuilder<T, S> {
    const selectQb = this.queryBuilder.select(fields);
    return new ScopedSelectQueryBuilder(selectQb);
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

  // Clone method for scoped query builder
  clone(): ScopedQueryBuilder<T> {
    const clonedQb = this.queryBuilder.clone();
    const clonedScoped = new ScopedQueryBuilder(clonedQb, this.scopes);
    return clonedScoped;
  }

  // Paginated methods for scoped query builder
  async getManyPaginated(pagination: PaginationInput): Promise<PaginationResult<T>> {
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Get total count with current query state
    const totalItems = await this.queryBuilder.count();
    const totalPages = Math.ceil(totalItems / pagination.pageSize);

    // Apply pagination to current query builder
    const data = await this.queryBuilder.limit(pagination.pageSize).offset(offset).getMany();

    return {
      data,
      pagination: {
        currentPage: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPreviousPage: pagination.page > 1,
      },
    };
  }
}

// Scoped select query builder that maintains scope functionality with typed selects
export class ScopedSelectQueryBuilder<T, S extends SelectFields<T>> {
  private selectQueryBuilder: SelectQueryBuilder<T, S>;

  constructor(selectQueryBuilder: SelectQueryBuilder<T, S>) {
    this.selectQueryBuilder = selectQueryBuilder;
  }

  async getMany(): Promise<SelectedType<T, S>[]> {
    return this.selectQueryBuilder.getMany();
  }

  async getOne(): Promise<SelectedType<T, S> | null> {
    return this.selectQueryBuilder.getOne();
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
