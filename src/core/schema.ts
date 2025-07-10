import { FieldDefinition, FieldsDefinition, getColumnName, TableConstraints } from '../types';

export interface CreateTableOptions {
  dropIfExists?: boolean;
  schema?: string;
}

export function generateCreateTableSQL(
  tableName: string,
  fieldsDefinition: FieldsDefinition,
  options: CreateTableOptions = {},
  constraints?: TableConstraints
): string {
  const { dropIfExists = false, schema } = options;
  const fullTableName = schema ? `${schema}.${tableName}` : tableName;
  
  let sql = '';
  
  // Drop table if exists
  if (dropIfExists) {
    sql += `DROP TABLE IF EXISTS ${fullTableName};\n\n`;
  }
  
  // Create enum types first and build a map for reuse
  const enumTypes = getEnumTypes(tableName, fieldsDefinition);
  const enumMap = createEnumNameMap(tableName, fieldsDefinition);
  
  for (const enumType of enumTypes) {
    sql += generateCreateEnumSQL(enumType.name, enumType.values) + '\n';
  }
  
  if (enumTypes.length > 0) {
    sql += '\n';
  }
  
  // Create table
  sql += `CREATE TABLE ${fullTableName} (\n`;
  
  const columnDefinitions: string[] = [];
  const uniqueConstraints: string[] = [];
  let primaryKeyColumns: string[] = [];
    // Generate column definitions
  for (const [fieldName, fieldDef] of Object.entries(fieldsDefinition)) {
    const columnName = getColumnName(fieldName, fieldDef);
    const columnDef = generateColumnDefinition(columnName, fieldDef, enumMap, fieldName);
    columnDefinitions.push(`  ${columnDef}`);
    
    // Collect primary key columns
    if (fieldDef.primaryKey) {
      primaryKeyColumns.push(columnName);
    }
    
    // Collect unique constraints (individual field constraints)
    if (fieldDef.unique && !fieldDef.primaryKey) {
      uniqueConstraints.push(`  UNIQUE (${columnName})`);
    }
  }

  // Add primary key constraint
  if (primaryKeyColumns.length > 0) {
    columnDefinitions.push(`  PRIMARY KEY (${primaryKeyColumns.join(', ')})`);
  }

  // Add unique constraints (individual fields)
  columnDefinitions.push(...uniqueConstraints);
  
  // Add combined unique constraints
  if (constraints?.unique) {
    for (const uniqueConstraint of constraints.unique) {
      const columnNames = uniqueConstraint.fields.map(field => {
        const fieldDef = fieldsDefinition[field];
        if (!fieldDef) {
          throw new Error(`Field '${field}' referenced in unique constraint does not exist in table '${tableName}'`);
        }
        return getColumnName(field, fieldDef);
      });
      
      const constraintName = uniqueConstraint.name 
        ? `CONSTRAINT ${uniqueConstraint.name} ` 
        : '';
      
      columnDefinitions.push(`  ${constraintName}UNIQUE (${columnNames.join(', ')})`);
    }
  }
  
  // Add custom constraints
  if (constraints?.custom) {
    for (const customConstraint of constraints.custom) {
      columnDefinitions.push(`  CONSTRAINT ${customConstraint.name} ${customConstraint.definition}`);
    }
  }
  
  sql += columnDefinitions.join(',\n');
  sql += '\n);';
  
  return sql;
}

export function createEnumNameMap(tableName: string, fieldsDefinition: FieldsDefinition): Map<string, string> {
  const enumMap = new Map<string, string>();
  const valueToName = new Map<string, string>();
  
  for (const [fieldName, fieldDef] of Object.entries(fieldsDefinition)) {
    if (fieldDef.type === 'enum' && fieldDef.enumValues) {
      let enumName: string;
      
      if (fieldDef.enumName) {
        // Use custom enum name
        enumName = fieldDef.enumName;
      } else {
        // Check if we already have an enum with the same values
        const sortedValues = [...fieldDef.enumValues].sort();
        const valuesKey = JSON.stringify(sortedValues);
        const existingEnumName = valueToName.get(valuesKey);
        
        if (existingEnumName) {
          // Reuse existing enum type
          enumName = existingEnumName;
        } else {
          // Create new enum type with tablename_property pattern
          enumName = `${tableName}_${fieldName}_enum`;
          valueToName.set(valuesKey, enumName);
        }
      }
      
      enumMap.set(fieldName, enumName);
    }
  }
  
  return enumMap;
}

export function generateColumnDefinition(columnName: string, fieldDef: FieldDefinition, enumMap?: Map<string, string>, fieldName?: string): string {
  let definition = `${columnName} ${getPostgreSQLType(fieldDef, enumMap, fieldName)}`;
  
  // Add NOT NULL constraint
  if (!fieldDef.nullable) {
    definition += ' NOT NULL';
  }
  
  // Add default value
  if (fieldDef.default !== undefined) {
    definition += ` DEFAULT ${formatDefaultValue(fieldDef.default, fieldDef.type)}`;
  }
  
  return definition;
}

export function getPostgreSQLType(fieldDef: FieldDefinition, enumMap?: Map<string, string>, fieldName?: string): string {
  switch (fieldDef.type) {
    case 'text':
      return 'TEXT';
    case 'uuid':
      return 'UUID';
    case 'integer':
      return 'INTEGER';
    case 'boolean':
      return 'BOOLEAN';
    case 'timestamp':
      return 'TIMESTAMP WITH TIME ZONE';
    case 'decimal':
      return 'DECIMAL';
    case 'json':
      return 'JSONB';
    case 'enum':
      if (!fieldDef.enumValues || fieldDef.enumValues.length === 0) {
        throw new Error('Enum field must have enumValues defined');
      }
      
      // Use enum map if available and field name is provided
      if (enumMap && fieldName && enumMap.has(fieldName)) {
        return enumMap.get(fieldName)!;
      }
      
      // Fallback to custom name or generate one
      return fieldDef.enumName || generateEnumTypeName(fieldDef.enumValues);
    default:
      throw new Error(`Unsupported field type: ${fieldDef.type}`);
  }
}

export function formatDefaultValue(value: unknown, type: string): string {
  if (value === null) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    if (type === 'uuid' && value.toLowerCase() === 'gen_random_uuid()') {
      return 'gen_random_uuid()';
    }
    if (type === 'timestamp' && value.toLowerCase() === 'now()') {
      return 'NOW()';
    }
    return `'${value.replace(/'/g, "''")}'`;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  
  return `'${String(value).replace(/'/g, "''")}'`;
}

interface EnumTypeInfo {
  name: string;
  values: string[];
}

export function getEnumTypes(tableName: string, fieldsDefinition: FieldsDefinition): EnumTypeInfo[] {
  const enumTypes: Map<string, string[]> = new Map();
  const valueToName: Map<string, string> = new Map(); // Map serialized values to enum name
  
  for (const [fieldName, fieldDef] of Object.entries(fieldsDefinition)) {
    if (fieldDef.type === 'enum' && fieldDef.enumValues) {
      let enumName: string;
      
      if (fieldDef.enumName) {
        // Use custom enum name
        enumName = fieldDef.enumName;
      } else {
        // Check if we already have an enum with the same values
        const sortedValues = [...fieldDef.enumValues].sort();
        const valuesKey = JSON.stringify(sortedValues);
        const existingEnumName = valueToName.get(valuesKey);
        
        if (existingEnumName) {
          // Reuse existing enum type
          enumName = existingEnumName;
        } else {
          // Create new enum type with tablename_property pattern
          enumName = `${tableName}_${fieldName}`;
          valueToName.set(valuesKey, enumName);
        }
      }
      
      // Check if we already have this enum type
      const existing = enumTypes.get(enumName);
      if (existing) {
        // Verify the values match
        if (JSON.stringify(existing.sort()) !== JSON.stringify([...fieldDef.enumValues].sort())) {
          throw new Error(`Enum type '${enumName}' is defined with different values in different fields`);
        }
      } else {
        enumTypes.set(enumName, [...fieldDef.enumValues]);
      }
    }
  }
  
  return Array.from(enumTypes.entries()).map(([name, values]) => ({ name, values }));
}

export function generateDefaultEnumTypeName(tableName?: string, fieldName?: string, enumValues?: string[]): string {
  if (tableName && fieldName) {
    // Use the tablename_property pattern
    return `${tableName}_${fieldName}`;
  }
  
  // Fallback to the old hash-based approach if table/field names not available
  if (enumValues) {
    return generateEnumTypeName(enumValues);
  }
  
  throw new Error('Cannot generate enum type name: missing required parameters');
}

export function generateEnumTypeName(enumValues: string[]): string {
  // Generate a deterministic enum type name based on the values (fallback method)
  const sortedValues = [...enumValues].sort();
  const hash = sortedValues.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `enum_${hash}`;
}

export function generateCreateEnumSQL(enumName: string, enumValues: string[]): string {
  const values = enumValues.map(value => `'${value.replace(/'/g, "''")}'`).join(', ');
  return `CREATE TYPE ${enumName} AS ENUM (${values});`;
}

export function generateDropEnumSQL(enumName: string): string {
  return `DROP TYPE IF EXISTS ${enumName};`;
}
