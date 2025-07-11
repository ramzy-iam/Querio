import {
  QueryExecutor,
  SelectFields,
  SelectedType,
  WhereCondition,
  PaginationInput,
  PaginationResult,
  FindOptions,
  FindOneOptions,
  FindPaginatedOptions,
  RelationLoadOptions,
} from "../types";
import { QueryBuilder, SelectQueryBuilder } from "../builder/QueryBuilder";
import { ModelInstance } from "../core/model";
import {
  getModelTable,
  getModelRelations,
  getRegisteredModel,
} from "../core/modelRegistry";
import { Relation } from "../core/relations";

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
export type EnhancedScopedQueryBuilder<
  T,
  S extends RepositoryScopes<T>
> = ScopedQueryBuilder<T> & ScopeMethods<T, S>;

export class Repository<T = any, S extends RepositoryScopes<T> = any> {
  private model: ModelInstance<T>;
  private scopes: S;
  private executor: QueryExecutor;

  constructor(model: ModelInstance<T>, scopes: S, executor: QueryExecutor) {
    this.model = model;
    this.scopes = scopes;
    this.executor = executor;
  }

  // Create a new scoped query builder with proper typing
  get scoped(): EnhancedScopedQueryBuilder<T, S> {
    const baseQueryBuilder = new QueryBuilder<T>(
      this.model.table,
      this.executor
    );
    return new ScopedQueryBuilder(
      baseQueryBuilder,
      this.scopes
    ) as EnhancedScopedQueryBuilder<T, S>;
  }

  // Direct access to query builder methods (more reliable than model methods)
  where(condition: WhereCondition<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(this.model.table, this.executor).where(
      condition
    );
  }

  orWhere(condition: WhereCondition<T>): QueryBuilder<T> {
    return new QueryBuilder<T>(this.model.table, this.executor).orWhere(
      condition
    );
  }

  groupBy(...fields: (keyof T)[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.model.table, this.executor).groupBy(
      ...fields
    );
  }

  addGroupBy(...fields: (keyof T)[]): QueryBuilder<T> {
    return new QueryBuilder<T>(this.model.table, this.executor).addGroupBy(
      ...fields
    );
  }

  select<S extends SelectFields<T>>(fields: S): SelectQueryBuilder<T, S> {
    return new QueryBuilder<T>(this.model.table, this.executor).select(fields);
  }

  // Enhanced getMany with options
  async getMany(): Promise<T[]>;
  async getMany<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select: S;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
    limit?: number;
    offset?: number;
  }): Promise<SelectedType<T, S>[]>;
  async getMany(options: {
    where?: WhereCondition<T>;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
    limit?: number;
    offset?: number;
  }): Promise<T[]>;
  async getMany<S extends SelectFields<T>>(options?: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
    limit?: number;
    offset?: number;
  }): Promise<T[] | SelectedType<T, S>[]> {
    let qb = new QueryBuilder<T>(this.model.table, this.executor);

    if (options) {
      if (options.where) {
        qb = qb.where(options.where);
      }
      if (options.groupBy && options.groupBy.length > 0) {
        qb = qb.groupBy(...options.groupBy);
      }
      if (options.having) {
        qb = qb.having(options.having);
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
        return qb.select(options.select).getMany() as Promise<
          SelectedType<T, S>[]
        >;
      }
    }

    return qb.getMany();
  }

  // Paginated getMany methods with proper overloads
  async getManyPaginated<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select: S;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
    pagination: PaginationInput;
  }): Promise<PaginationResult<SelectedType<T, S>>>;
  async getManyPaginated(options: {
    where?: WhereCondition<T>;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
    pagination: PaginationInput;
  }): Promise<PaginationResult<T>>;
  async getManyPaginated<S extends SelectFields<T>>(options: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
    pagination: PaginationInput;
  }): Promise<PaginationResult<T> | PaginationResult<SelectedType<T, S>>> {
    const { pagination } = options;
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Build base query for counting
    let countQb = new QueryBuilder<T>(this.model.table, this.executor);
    if (options.where) {
      countQb = countQb.where(options.where);
    }
    if (options.groupBy && options.groupBy.length > 0) {
      countQb = countQb.groupBy(...options.groupBy);
    }
    if (options.having) {
      countQb = countQb.having(options.having);
    }

    // Get total count
    const totalItems = await countQb.count();
    const totalPages = Math.ceil(totalItems / pagination.pageSize);

    // Build query for data
    let dataQb = new QueryBuilder<T>(this.model.table, this.executor);
    if (options.where) {
      dataQb = dataQb.where(options.where);
    }
    if (options.groupBy && options.groupBy.length > 0) {
      dataQb = dataQb.groupBy(...options.groupBy);
    }
    if (options.having) {
      dataQb = dataQb.having(options.having);
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
    select: S;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
  }): Promise<SelectedType<T, S> | null>;
  async getOne(options: {
    where?: WhereCondition<T>;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
  }): Promise<T | null>;
  async getOne<S extends SelectFields<T>>(options?: {
    where?: WhereCondition<T>;
    select?: S;
    orderBy?: { field: keyof T; direction?: "asc" | "desc" };
    groupBy?: (keyof T)[];
    having?: WhereCondition<T>;
  }): Promise<T | SelectedType<T, S> | null> {
    let qb = new QueryBuilder<T>(this.model.table, this.executor);

    if (options) {
      if (options.where) {
        qb = qb.where(options.where);
      }
      if (options.groupBy && options.groupBy.length > 0) {
        qb = qb.groupBy(...options.groupBy);
      }
      if (options.having) {
        qb = qb.having(options.having);
      }
      if (options.orderBy) {
        qb = qb.orderBy(options.orderBy.field, options.orderBy.direction);
      }
      if (options.select) {
        return qb.select(options.select).getOne() as Promise<SelectedType<
          T,
          S
        > | null>;
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
    return await queryBuilder.insert(data);
  }

  // Bulk create
  async createMany(data: Partial<T>[]): Promise<T[]> {
    if (data.length === 0) return [];
    const queryBuilder = new QueryBuilder<T>(this.model.table, this.executor);
    return await queryBuilder.insertMany(data);
  }

  // Generic find method with relation support
  async find(options?: FindOptions<T>): Promise<T[]> {
    let qb = new QueryBuilder<T>(this.model.table, this.executor);

    if (options) {
      if (options.where) {
        qb = qb.where(options.where);
      }
      if (options.groupBy && options.groupBy.length > 0) {
        qb = qb.groupBy(...options.groupBy);
      }
      if (options.having) {
        qb = qb.having(options.having);
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
    }

    let results: T[];
    if (options?.select) {
      results = (await qb.select(options.select).getMany()) as T[];
    } else {
      results = await qb.getMany();
    }

    // Load relations if specified
    if (options?.relations && Object.keys(options.relations).length > 0) {
      results = await this.loadRelations(results, options.relations);
    }

    return results;
  }

  // Generic findOne method with relation support
  async findOne(options?: FindOneOptions<T>): Promise<T | null> {
    let qb = new QueryBuilder<T>(this.model.table, this.executor);

    if (options) {
      if (options.where) {
        qb = qb.where(options.where);
      }
      if (options.groupBy && options.groupBy.length > 0) {
        qb = qb.groupBy(...options.groupBy);
      }
      if (options.having) {
        qb = qb.having(options.having);
      }
      if (options.orderBy) {
        qb = qb.orderBy(options.orderBy.field, options.orderBy.direction);
      }
    }

    let result: T | null;
    if (options?.select) {
      result = (await qb.select(options.select).getOne()) as T | null;
    } else {
      result = await qb.getOne();
    }

    // Load relations if specified and result exists
    if (
      result &&
      options?.relations &&
      Object.keys(options.relations).length > 0
    ) {
      const results = await this.loadRelations([result], options.relations);
      return results[0] || null;
    }

    return result;
  }

  // Generic findPaginated method with relation support
  async findPaginated(
    options: FindPaginatedOptions<T>
  ): Promise<PaginationResult<T>> {
    const { pagination, relations, groupBy, having, ...findOptions } = options;
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Build base query for counting
    let countQb = new QueryBuilder<T>(this.model.table, this.executor);
    if (findOptions.where) {
      countQb = countQb.where(findOptions.where);
    }
    if (groupBy && groupBy.length > 0) {
      countQb = countQb.groupBy(...groupBy);
    }
    if (having) {
      countQb = countQb.having(having);
    }

    // Get total count
    const totalItems = await countQb.count();
    const totalPages = Math.ceil(totalItems / pagination.pageSize);

    // Build query for data with pagination
    const dataOptions: FindOptions<T> = {
      ...findOptions,
      ...(groupBy && { groupBy }),
      ...(having && { having }),
      limit: pagination.pageSize,
      offset,
      ...(relations && { relations }),
    };

    const data = await this.find(dataOptions);

    // Build pagination result
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

  // Private method to load relations for a set of records
  private async loadRelations(
    records: T[],
    relationOptions: RelationLoadOptions
  ): Promise<T[]> {
    if (!records.length) return records;

    // Get the model name - for now we'll try to use table name as a fallback
    const modelName = this.getModelName();

    // Try to get the model's registered relations
    let modelRelations;
    try {
      modelRelations = getModelRelations(modelName);
    } catch (error) {
      console.warn(
        `Model '${modelName}' not found in registry. Relation loading skipped.`
      );
      return records;
    }

    if (!modelRelations) {
      console.warn(`No relations defined for model '${modelName}'`);
      return records;
    }

    // Process each requested relation
    for (const [relationName, loadOption] of Object.entries(relationOptions)) {
      if (!loadOption) continue; // Skip if false

      const relation = modelRelations[relationName];
      if (!relation) {
        console.warn(
          `Relation '${relationName}' not found for model '${modelName}'`
        );
        continue;
      }

      try {
        await this.loadSingleRelation(
          records,
          relationName,
          relation,
          loadOption
        );
      } catch (error) {
        console.error(`Error loading relation '${relationName}':`, error);
      }
    }

    return records;
  }

  // Private method to load a single relation for records
  private async loadSingleRelation(
    records: T[],
    relationName: string,
    relation: Relation,
    loadOption: boolean | RelationLoadOptions
  ): Promise<void> {
    let targetTable: string;
    try {
      targetTable = getModelTable(relation.targetModel);
    } catch (error) {
      console.warn(
        `Target model '${relation.targetModel}' not found in registry. Using target model name as table name.`
      );
      targetTable = relation.targetModel;
    }

    const localKey = relation.localKey || "id";

    // Extract IDs for the relation query
    const ids = records
      .map((record) => (record as any)[localKey])
      .filter((id) => id != null);

    if (!ids.length) return;

    let relatedRecords: any[] = [];

    switch (relation.type) {
      case "hasOne":
      case "hasMany":
        // Query: SELECT * FROM target_table WHERE foreign_key IN (ids)
        const hasQuery = new QueryBuilder(targetTable, this.executor).where({
          [relation.foreignKey]: { in: ids },
        });
        relatedRecords = await hasQuery.getMany();

        // Map results back to parent records
        for (const record of records) {
          const recordId = (record as any)[localKey];
          const related = relatedRecords.filter(
            (r) => r[relation.foreignKey] === recordId
          );

          if (relation.type === "hasOne") {
            (record as any)[relationName] = related[0] || null;
          } else {
            (record as any)[relationName] = related;
          }
        }
        break;

      case "belongsTo":
        // Query: SELECT * FROM target_table WHERE local_key IN (foreign_keys)
        const foreignKeys = records
          .map((record) => (record as any)[relation.foreignKey])
          .filter((id) => id != null);

        if (foreignKeys.length) {
          const belongsQuery = new QueryBuilder(
            targetTable,
            this.executor
          ).where({ [localKey]: { in: foreignKeys } });
          relatedRecords = await belongsQuery.getMany();

          // Map results back to parent records
          for (const record of records) {
            const foreignKey = (record as any)[relation.foreignKey];
            const related = relatedRecords.find(
              (r) => r[localKey] === foreignKey
            );
            (record as any)[relationName] = related || null;
          }
        }
        break;

      case "belongsToMany":
        // Handle many-to-many relationships using pivot table
        if (
          relation.pivotTable &&
          "pivotForeignKey" in relation &&
          "pivotRelatedKey" in relation
        ) {
          // Query pivot table to get related IDs
          const pivotQuery = new QueryBuilder(
            relation.pivotTable,
            this.executor
          ).where({ [relation.pivotForeignKey]: { in: ids } });
          const pivotRecords = await pivotQuery.getMany();

          if (pivotRecords.length) {
            // Get related record IDs from pivot table
            const relatedIds = pivotRecords
              .map((pivot: any) => pivot[relation.pivotRelatedKey])
              .filter((id) => id != null);

            if (relatedIds.length) {
              // Query the target table for related records
              const relatedQuery = new QueryBuilder(
                targetTable,
                this.executor
              ).where({ id: { in: relatedIds } });
              relatedRecords = await relatedQuery.getMany();

              // Map results back to parent records through pivot table
              for (const record of records) {
                const recordId = (record as any)[localKey];
                const pivotMatches = pivotRecords.filter(
                  (pivot: any) => pivot[relation.pivotForeignKey] === recordId
                );
                const relatedForRecord = pivotMatches
                  .map((pivot: any) => {
                    return relatedRecords.find(
                      (related: any) =>
                        related.id === pivot[relation.pivotRelatedKey]
                    );
                  })
                  .filter((related) => related != null);

                (record as any)[relationName] = relatedForRecord;
              }
            }
          }
        } else {
          console.warn(
            `belongsToMany relation '${relationName}' requires a pivotTable and pivot keys`
          );
        }
        break;
    }

    // Handle nested relation loading
    if (typeof loadOption === "object" && relatedRecords.length) {
      // Get the related model from registry
      let relatedModel: any;
      try {
        relatedModel = getRegisteredModel(relation.targetModel);
        if (!relatedModel) {
          throw new Error(
            `Model '${relation.targetModel}' not found in registry`
          );
        }
      } catch (error) {
        console.warn(
          `Cannot load nested relations: Target model '${relation.targetModel}' not found in registry`
        );
        return;
      }

      // Create a repository for the related model
      const relatedRepository = new Repository(relatedModel, {}, this.executor);

      // Load nested relations on the related records
      await relatedRepository.loadRelations(
        relatedRecords,
        loadOption as Record<string, boolean | Record<string, boolean>>
      );
    }
  }

  // Helper method to get model name (you might need to adjust this based on your model structure)
  private getModelName(): string {
    // For now, we'll try to use the table name as the model name
    // In a more complete implementation, this would be stored during model definition
    return this.model.table;
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
    Object.keys(this.scopes).forEach((scopeName) => {
      (this as any)[scopeName] = (...args: any[]) => {
        const scopeFunction = this.scopes[scopeName](...args);
        this.queryBuilder = scopeFunction(this.queryBuilder);
        return this;
      };
    });
  }

  // Standard query builder methods
  where(condition: WhereCondition<T>): this {
    this.queryBuilder = this.queryBuilder.where(condition);
    return this;
  }

  andWhere(condition: WhereCondition<T>): this {
    this.queryBuilder = this.queryBuilder.andWhere(condition);
    return this;
  }

  orWhere(condition: WhereCondition<T>): this {
    this.queryBuilder = this.queryBuilder.orWhere(condition);
    return this;
  }

  orderBy(field: keyof T, direction: "asc" | "desc" = "asc"): this {
    this.queryBuilder = this.queryBuilder.orderBy(field, direction);
    return this;
  }

  groupBy(...fields: (keyof T)[]): this {
    this.queryBuilder = this.queryBuilder.groupBy(...fields);
    return this;
  }

  addGroupBy(...fields: (keyof T)[]): this {
    this.queryBuilder = this.queryBuilder.addGroupBy(...fields);
    return this;
  }

  having(condition: WhereCondition<T>): this {
    this.queryBuilder = this.queryBuilder.having(condition);
    return this;
  }

  andHaving(condition: WhereCondition<T>): this {
    this.queryBuilder = this.queryBuilder.andHaving(condition);
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
  async getManyPaginated(
    pagination: PaginationInput
  ): Promise<PaginationResult<T>> {
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Get total count with current query state
    const totalItems = await this.queryBuilder.count();
    const totalPages = Math.ceil(totalItems / pagination.pageSize);

    // Apply pagination to current query builder
    const data = await this.queryBuilder
      .limit(pagination.pageSize)
      .offset(offset)
      .getMany();

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
  Object.keys(config.scopes).forEach((scopeName) => {
    (repository as any)[scopeName] = (...args: any[]) => {
      const scoped = repository.scoped;
      return (scoped as any)[scopeName](...args);
    };
  });

  return repository as Repository<T, S> & ScopeMethods<T, S>;
}
