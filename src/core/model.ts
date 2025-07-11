import {
  FieldsDefinition,
  QueryExecutor,
  WhereCondition,
  SelectFields,
} from "../types";
import { QueryBuilder, SelectQueryBuilder } from "../builder/QueryBuilder";
import { RelationDefinition, WithRelations } from "./relations";
import { ModelConfiguration, registerModel } from "./modelRegistry";
import { RelationLoader } from "./relationLoader";

export interface ModelInstance<T = any> {
  readonly name: string;
  readonly table: string;
  readonly fields: FieldsDefinition;
  readonly relations?: RelationDefinition;

  // Basic query methods
  where: (condition: WhereCondition<T>) => QueryBuilder<T>;
  andWhere: (condition: WhereCondition<T>) => QueryBuilder<T>;
  orWhere: (condition: WhereCondition<T>) => QueryBuilder<T>;
  select: <S extends SelectFields<T>>(fields: S) => SelectQueryBuilder<T, S>;
  update: (data: Partial<T>) => Promise<T[]>;
  delete: () => Promise<T[]>;
  getMany: () => Promise<T[]>;
  getOne: () => Promise<T | null>;
  count: () => Promise<number>;

  // Query methods with relations
  with: <W extends WithRelations<T>>(
    relations: W
  ) => QueryBuilderWithRelations<T>;

  // Order and limit methods
  orderBy: (field: keyof T, direction?: "asc" | "desc") => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  offset: (count: number) => QueryBuilder<T>;

  // Group by methods
  groupBy: (...fields: (keyof T)[]) => QueryBuilder<T>;
  addGroupBy: (...fields: (keyof T)[]) => QueryBuilder<T>;
  having: (condition: WhereCondition<T>) => QueryBuilder<T>;

  // Join methods
  innerJoin: (table: string, on: string, alias?: string) => QueryBuilder<T>;
  leftJoin: (table: string, on: string, alias?: string) => QueryBuilder<T>;
  rightJoin: (table: string, on: string, alias?: string) => QueryBuilder<T>;

  // Relation methods
  load: <K extends keyof T>(entity: T, relations: K[]) => Promise<T>;
  loadOne: <K extends keyof T>(entity: T, relation: K) => Promise<T>;

  // Scopes
  scope: any;
}

export class QueryBuilderWithRelations<T> extends QueryBuilder<T> {
  private relationLoader: RelationLoader;
  private relationIncludes: WithRelations<T>;

  constructor(
    table: string,
    executor: QueryExecutor,
    fields: FieldsDefinition,
    relationLoader: RelationLoader,
    relationIncludes: WithRelations<T>
  ) {
    super(table, executor, fields);
    this.relationLoader = relationLoader;
    this.relationIncludes = relationIncludes;
  }

  async getMany(): Promise<T[]> {
    const entities = await super.getMany();
    return this.relationLoader.loadRelations(entities, this.relationIncludes);
  }

  async getOne(): Promise<T | null> {
    const entity = await super.getOne();
    if (!entity) return null;

    const [entityWithRelations] = await this.relationLoader.loadRelations(
      [entity],
      this.relationIncludes
    );
    return entityWithRelations || null;
  }

  // Override other methods that need relation loading
  where(condition: WhereCondition<T>): this {
    super.where(condition);
    return this;
  }

  andWhere(condition: WhereCondition<T>): this {
    super.andWhere(condition);
    return this;
  }

  orWhere(condition: WhereCondition<T>): this {
    super.orWhere(condition);
    return this;
  }

  orderBy(field: keyof T, direction: "asc" | "desc" = "asc"): this {
    super.orderBy(field, direction);
    return this;
  }

  groupBy(...fields: (keyof T)[]): this {
    super.groupBy(...fields);
    return this;
  }

  addGroupBy(...fields: (keyof T)[]): this {
    super.addGroupBy(...fields);
    return this;
  }

  having(condition: WhereCondition<T>): this {
    super.having(condition);
    return this;
  }

  limit(count: number): this {
    super.limit(count);
    return this;
  }

  offset(count: number): this {
    super.offset(count);
    return this;
  }
}

let globalExecutor: QueryExecutor | null = null;

export function setGlobalExecutor(executor: QueryExecutor): void {
  globalExecutor = executor;
}

export function defineModel<T>(
  name: string,
  config: ModelConfiguration
): ModelInstance<T> {
  // Register the model
  const registeredModel = registerModel(name, config);

  const createQueryBuilder = (): QueryBuilder<T> => {
    if (!globalExecutor) {
      throw new Error(
        "No executor configured. Call setGlobalExecutor() first."
      );
    }
    return new QueryBuilder<T>(
      registeredModel.table,
      globalExecutor,
      registeredModel.actualFields // Use separated fields
    );
  };

  const createRelationLoader = (): RelationLoader => {
    if (!globalExecutor) {
      throw new Error(
        "No executor configured. Call setGlobalExecutor() first."
      );
    }
    return new RelationLoader(globalExecutor);
  };

  const model: ModelInstance<T> = {
    name: registeredModel.name,
    table: registeredModel.table,
    fields: registeredModel.fields, // Keep original for compatibility
    ...(registeredModel.actualRelations &&
      Object.keys(registeredModel.actualRelations).length > 0 && {
        relations: registeredModel.actualRelations,
      }),

    // Basic query methods
    where: (condition: WhereCondition<T>) =>
      createQueryBuilder().where(condition),
    andWhere: (condition: WhereCondition<T>) =>
      createQueryBuilder().andWhere(condition),
    orWhere: (condition: WhereCondition<T>) =>
      createQueryBuilder().orWhere(condition),
    select: <S extends SelectFields<T>>(fields: S) =>
      createQueryBuilder().select(fields),
    update: (data: Partial<T>) => createQueryBuilder().update(data),
    delete: () => createQueryBuilder().delete(),
    getMany: () => createQueryBuilder().getMany(),
    getOne: () => createQueryBuilder().getOne(),
    count: () => createQueryBuilder().count(),

    // Query with relations
    with: <W extends WithRelations<T>>(relations: W) => {
      if (!globalExecutor) {
        throw new Error(
          "No executor configured. Call setGlobalExecutor() first."
        );
      }
      const relationLoader = createRelationLoader();
      return new QueryBuilderWithRelations<T>(
        registeredModel.table,
        globalExecutor,
        registeredModel.actualFields, // Use separated fields
        relationLoader,
        relations
      );
    },

    // Order and limit methods
    orderBy: (field, direction) =>
      createQueryBuilder().orderBy(field, direction),
    limit: (count) => createQueryBuilder().limit(count),
    offset: (count) => createQueryBuilder().offset(count),

    // Group by methods
    groupBy: (...fields) => createQueryBuilder().groupBy(...fields),
    addGroupBy: (...fields) => createQueryBuilder().addGroupBy(...fields),
    having: (condition) => createQueryBuilder().having(condition),

    // Join methods
    innerJoin: (table, on, alias) =>
      createQueryBuilder().innerJoin(table, on, alias),
    leftJoin: (table, on, alias) =>
      createQueryBuilder().leftJoin(table, on, alias),
    rightJoin: (table, on, alias) =>
      createQueryBuilder().rightJoin(table, on, alias),

    // Relation methods
    load: async <K extends keyof T>(entity: T, relations: K[]) => {
      const relationLoader = createRelationLoader();
      const relationIncludes: WithRelations<T> = {};
      relations.forEach((rel) => {
        (relationIncludes as any)[rel] = true;
      });
      const [loaded] = await relationLoader.loadRelations(
        [entity],
        relationIncludes
      );
      return loaded;
    },

    loadOne: async <K extends keyof T>(entity: T, relation: K) => {
      return model.load(entity, [relation]);
    },

    // Scopes - initially empty, can be extended
    scope: {},
  };

  return model;
}
