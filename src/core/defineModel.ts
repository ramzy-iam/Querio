import { FieldsDefinition, QueryExecutor, WhereCondition, SelectFields, RelationsDefinition } from '../types';
import { QueryBuilder, SelectQueryBuilder } from '../builder/QueryBuilder';
// import { RelationLoader } from './relations';

export interface ModelInstance<T = any> {
  table: string;
  fields: FieldsDefinition;
  relations?: RelationsDefinition;
  
  // Query methods with proper typing
  where: (condition: WhereCondition<T>) => QueryBuilder<T>;
  andWhere: (condition: WhereCondition<T>) => QueryBuilder<T>;
  select: <S extends SelectFields<T>>(fields: S) => SelectQueryBuilder<T, S>;
  update: (data: Partial<T>) => Promise<T[]>;
  delete: () => Promise<T[]>;
  getMany: () => Promise<T[]>;
  getOne: () => Promise<T | null>;
  count: () => Promise<number>;
  
  // Order and limit methods
  orderBy: (field: keyof T, direction?: 'asc' | 'desc') => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  offset: (count: number) => QueryBuilder<T>;
  
  // Join methods
  innerJoin: (table: string, on: string, alias?: string) => QueryBuilder<T>;
  leftJoin: (table: string, on: string, alias?: string) => QueryBuilder<T>;
  rightJoin: (table: string, on: string, alias?: string) => QueryBuilder<T>;
  
  // Scopes
  scope: any;
}

let globalExecutor: QueryExecutor | null = null;

export function setGlobalExecutor(executor: QueryExecutor): void {
  globalExecutor = executor;
}

export function defineModel<T = any>(
  definition: { table: string; fields: FieldsDefinition; relations?: RelationsDefinition }
): ModelInstance<T> {
  const createQueryBuilder = (): QueryBuilder<T> => {
    if (!globalExecutor) {
      throw new Error('No executor configured. Call setGlobalExecutor() first.');
    }
    return new QueryBuilder<T>(definition.table, globalExecutor, definition.fields);
  };

  // const relationLoader = new RelationLoader(globalExecutor!);

  const model: ModelInstance<T> = {
    table: definition.table,
    fields: definition.fields,
    relations: definition.relations || {},
    
    // Query methods with explicit type annotations
    where: (condition: WhereCondition<T>) => createQueryBuilder().where(condition),
    andWhere: (condition: WhereCondition<T>) => createQueryBuilder().andWhere(condition),
    select: <S extends SelectFields<T>>(fields: S) => createQueryBuilder().select(fields),
    update: (data: Partial<T>) => createQueryBuilder().update(data),
    delete: () => createQueryBuilder().delete(),
    getMany: () => createQueryBuilder().getMany(),
    getOne: () => createQueryBuilder().getOne(),
    count: () => createQueryBuilder().count(),
    
 
    
    // Order and limit methods
    orderBy: (field, direction) => createQueryBuilder().orderBy(field, direction),
    limit: (count) => createQueryBuilder().limit(count),
    offset: (count) => createQueryBuilder().offset(count),
    
    // Join methods
    innerJoin: (table, on, alias) => createQueryBuilder().innerJoin(table, on, alias),
    leftJoin: (table, on, alias) => createQueryBuilder().leftJoin(table, on, alias),
    rightJoin: (table, on, alias) => createQueryBuilder().rightJoin(table, on, alias),
    
    // Scopes - initially empty, can be extended
    scope: {}
  };

  return model;
}
