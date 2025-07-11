import { FieldsDefinition, TableConstraints, FieldDefinition } from "../types";
import { RelationDefinition, Relation } from "./relations";

export interface ModelConfiguration {
  table: string;
  fields: FieldsDefinition;
  constraints?: TableConstraints;
  relations?: RelationDefinition; // Keep for backward compatibility
}

export interface RegisteredModel extends ModelConfiguration {
  name: string;
  actualFields: Record<string, FieldDefinition>; // Separated actual fields
  actualRelations: RelationDefinition; // Separated relations
}

// Global model registry
const modelRegistry = new Map<string, RegisteredModel>();

// Helper function to separate fields from relations
function separateFieldsAndRelations(fields: FieldsDefinition): {
  actualFields: Record<string, FieldDefinition>;
  actualRelations: RelationDefinition;
} {
  const actualFields: Record<string, FieldDefinition> = {};
  const actualRelations: RelationDefinition = {};

  for (const [key, value] of Object.entries(fields)) {
    // Check if it's a relation by checking if it has a relation type
    if (value && typeof value === "object" && "type" in value) {
      const relationType = (value as any).type;
      if (
        ["hasOne", "hasMany", "belongsTo", "belongsToMany"].includes(
          relationType
        )
      ) {
        actualRelations[key] = value as Relation;
      } else {
        actualFields[key] = value as FieldDefinition;
      }
    } else {
      actualFields[key] = value as FieldDefinition;
    }
  }

  return { actualFields, actualRelations };
}

export function registerModel(
  name: string,
  config: ModelConfiguration
): RegisteredModel {
  const { actualFields, actualRelations } = separateFieldsAndRelations(
    config.fields
  );

  // Merge with explicit relations if provided
  const mergedRelations = { ...actualRelations, ...(config.relations || {}) };

  const registeredModel: RegisteredModel = {
    name,
    ...config,
    actualFields,
    actualRelations: mergedRelations,
  };

  modelRegistry.set(name, registeredModel);
  return registeredModel;
}

export function getRegisteredModel(name: string): RegisteredModel | undefined {
  return modelRegistry.get(name);
}

export function getAllRegisteredModels(): Map<string, RegisteredModel> {
  return new Map(modelRegistry);
}

export function clearModelRegistry(): void {
  modelRegistry.clear();
}

// Helper to check if a model exists
export function modelExists(name: string): boolean {
  return modelRegistry.has(name);
}

// Helper to get model table name
export function getModelTable(name: string): string {
  const model = getRegisteredModel(name);
  if (!model) {
    throw new Error(`Model '${name}' not found in registry`);
  }
  return model.table;
}

// Helper to get model fields
export function getModelFields(name: string): FieldsDefinition {
  const model = getRegisteredModel(name);
  if (!model) {
    throw new Error(`Model '${name}' not found in registry`);
  }
  return model.fields;
}

// Helper to get model relations
export function getModelRelations(
  name: string
): RelationDefinition | undefined {
  const model = getRegisteredModel(name);
  if (!model) {
    throw new Error(`Model '${name}' not found in registry`);
  }
  return model.relations;
}
