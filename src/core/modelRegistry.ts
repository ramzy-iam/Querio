import { FieldsDefinition, TableConstraints } from "../types";
import { RelationDefinition } from "./relations";

export interface ModelConfiguration {
  table: string;
  fields: FieldsDefinition;
  constraints?: TableConstraints;
  relations?: RelationDefinition;
}

export interface RegisteredModel extends ModelConfiguration {
  name: string;
}

// Global model registry
const modelRegistry = new Map<string, RegisteredModel>();

export function registerModel(
  name: string,
  config: ModelConfiguration
): RegisteredModel {
  const registeredModel: RegisteredModel = {
    name,
    ...config,
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
