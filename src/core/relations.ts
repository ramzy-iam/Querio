// Core relation types for Querio ORM
export type RelationType = "hasOne" | "hasMany" | "belongsTo" | "belongsToMany";

export interface BaseRelation {
  type: RelationType;
  targetModel: string; // Model name or table name
  foreignKey: string;
  localKey?: string; // Defaults to 'id'
  as?: string; // Alias for the relation
}

export interface HasOneRelation extends BaseRelation {
  type: "hasOne";
}

export interface HasManyRelation extends BaseRelation {
  type: "hasMany";
}

export interface BelongsToRelation extends BaseRelation {
  type: "belongsTo";
}

export interface BelongsToManyRelation extends BaseRelation {
  type: "belongsToMany";
  pivotTable: string;
  pivotForeignKey: string;
  pivotRelatedKey: string;
  pivotLocalKey?: string; // Defaults to 'id'
}

export type Relation =
  | HasOneRelation
  | HasManyRelation
  | BelongsToRelation
  | BelongsToManyRelation;

export interface RelationDefinition {
  [relationName: string]: Relation;
}

// Type for model instance to enable IntelliSense
export interface ModelInstanceRef {
  readonly name: string;
  readonly table: string;
  [key: string]: any;
}

// Helper type to extract foreign key names from a type
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Type for foreign key fields (string fields that could be foreign keys)
export type ForeignKeyField<T> = KeysOfType<T, string> | KeysOfType<T, string | null>;

// Relation builder helpers - accept both model references and table names for simplicity
export function hasOne<T>(
  targetModel: ModelInstanceRef | string,
  foreignKey: ForeignKeyField<T> | string,
  localKey: string = "id",
  as?: string
): HasOneRelation {
  const modelName = typeof targetModel === 'string' ? targetModel : targetModel.name;
  return {
    type: "hasOne",
    targetModel: modelName,
    foreignKey: foreignKey as string,
    localKey,
    ...(as && { as }),
  };
}

export function hasMany<T>(
  targetModel: ModelInstanceRef | string,
  foreignKey: ForeignKeyField<T> | string,
  localKey: string = "id",
  as?: string
): HasManyRelation {
  const modelName = typeof targetModel === 'string' ? targetModel : targetModel.name;
  return {
    type: "hasMany",
    targetModel: modelName,
    foreignKey: foreignKey as string,
    localKey,
    ...(as && { as }),
  };
}

export function belongsTo<T>(
  targetModel: ModelInstanceRef | string,
  foreignKey: ForeignKeyField<T> | string,
  localKey: string = "id",
  as?: string
): BelongsToRelation {
  const modelName = typeof targetModel === 'string' ? targetModel : targetModel.name;
  return {
    type: "belongsTo",
    targetModel: modelName,
    foreignKey: foreignKey as string,
    localKey,
    ...(as && { as }),
  };
}

export function belongsToMany(
  targetModel: ModelInstanceRef | string,
  pivotTable: ModelInstanceRef | string,
  pivotForeignKey: string,
  pivotRelatedKey: string,
  localKey: string = "id",
  as?: string
): BelongsToManyRelation {
  const modelName = typeof targetModel === 'string' ? targetModel : targetModel.name;
  const pivotTableName = typeof pivotTable === 'string' ? pivotTable : pivotTable.table;
  return {
    type: "belongsToMany",
    targetModel: modelName,
    foreignKey: "", // Not used for many-to-many
    pivotTable: pivotTableName,
    pivotForeignKey,
    pivotRelatedKey,
    pivotLocalKey: localKey,
    ...(as && { as }),
  };
}

// Utility types for inferring relation results
export type RelationResult<T extends Relation> = T extends
  | HasOneRelation
  | BelongsToRelation
  ? any | null
  : T extends HasManyRelation | BelongsToManyRelation
  ? any[]
  : never;

// With relations type for including relations in queries
export type WithRelations<T> = {
  [K in keyof T]?: boolean | WithRelations<any>;
};
