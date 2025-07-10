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

// Relation builder helpers
export function hasOne(
  targetModel: string,
  foreignKey: string,
  localKey: string = "id",
  as?: string
): HasOneRelation {
  return {
    type: "hasOne",
    targetModel,
    foreignKey,
    localKey,
    ...(as && { as }),
  };
}

export function hasMany(
  targetModel: string,
  foreignKey: string,
  localKey: string = "id",
  as?: string
): HasManyRelation {
  return {
    type: "hasMany",
    targetModel,
    foreignKey,
    localKey,
    ...(as && { as }),
  };
}

export function belongsTo(
  targetModel: string,
  foreignKey: string,
  localKey: string = "id",
  as?: string
): BelongsToRelation {
  return {
    type: "belongsTo",
    targetModel,
    foreignKey,
    localKey,
    ...(as && { as }),
  };
}

export function belongsToMany(
  targetModel: string,
  pivotTable: string,
  pivotForeignKey: string,
  pivotRelatedKey: string,
  localKey: string = "id",
  as?: string
): BelongsToManyRelation {
  return {
    type: "belongsToMany",
    targetModel,
    foreignKey: "", // Not used for many-to-many
    pivotTable,
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
