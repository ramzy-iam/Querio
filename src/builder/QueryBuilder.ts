import { 
  WhereCondition, 
  OrderBy, 
  SelectFields, 
  SelectedType, 
  JoinCondition,
  SQLQuery,
  QueryExecutor,
  FieldsDefinition,
  getColumnName,
  mapFieldsToColumns,
  mapRowsToEntities,
  mapColumnsToFields
} from '../types';

export class QueryBuilder<T> {
  private whereConditions: WhereCondition<T>[] = [];
  private orderByConditions: OrderBy<T>[] = [];
  private joinConditions: JoinCondition[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(
    private tableName: string,
    private executor: QueryExecutor,
    private fieldsDefinition: FieldsDefinition = {}
  ) {}

  // Clone method to create a deep copy of the query builder
  clone(): QueryBuilder<T> {
    const cloned = new QueryBuilder<T>(this.tableName, this.executor, this.fieldsDefinition);
    
    // Deep copy all the query state
    cloned.whereConditions = [...this.whereConditions.map(condition => 
      JSON.parse(JSON.stringify(condition))
    )];
    cloned.orderByConditions = [...this.orderByConditions.map(order => 
      typeof order === 'string' ? order : JSON.parse(JSON.stringify(order))
    )];
    cloned.joinConditions = [...this.joinConditions.map(join => ({ ...join }))];
    
    if (this.limitValue !== undefined) {
      cloned.limitValue = this.limitValue;
    }
    if (this.offsetValue !== undefined) {
      cloned.offsetValue = this.offsetValue;
    }
    
    return cloned;
  }

  // Helper method to convert entity field names to database column names
  private getColumnName(field: string): string {
    return getColumnName(field, this.fieldsDefinition[field]);
  }

  // Where methods
  where(condition: WhereCondition<T>): this {
    // Check if condition is an empty object
    if (this.isEmptyCondition(condition)) {
      this.whereConditions = [];
      return this;
    }
    
    // If there are no existing conditions, start fresh
    // If there are existing conditions, this replaces them (original behavior)
    this.whereConditions = [condition];
    return this;
  }

  andWhere(condition: WhereCondition<T>): this {
    // Check if condition is an empty object
    if (this.isEmptyCondition(condition)) {
      return this;
    }
    // andWhere adds a condition - can be used without initial where
    this.whereConditions.push(condition);
    return this;
  }

  private isEmptyCondition(condition: WhereCondition<T>): boolean {
    if (!condition || typeof condition !== 'object') return false;
    
    // Check if it's an empty object
    const keys = Object.keys(condition);
    if (keys.length === 0) return true;
    
    // Check if all values are undefined
    return keys.every(key => {
      const value = (condition as any)[key];
      return value === undefined;
    });
  }

  orWhere(condition: WhereCondition<T>): this {
    // orWhere ajoute une condition OR - pour l'instant traité comme AND
    // TODO: Implémenter la logique OR proprement
    this.whereConditions.push(condition);
    return this;
  }

  // Méthode pour ajouter plusieurs conditions where (alternative à where().andWhere())
  whereMultiple(...conditions: WhereCondition<T>[]): this {
    this.whereConditions = [...conditions];
    return this;
  }

  // Order by methods
  orderBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByConditions.push({ [field]: direction } as OrderBy<T>);
    return this;
  }

  // Limit and offset
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  // Join methods
  innerJoin(table: string, on: string, alias?: string): this {
    const joinCondition: JoinCondition = { table, type: 'inner', on };
    if (alias) joinCondition.alias = alias;
    this.joinConditions.push(joinCondition);
    return this;
  }

  leftJoin(table: string, on: string, alias?: string): this {
    const joinCondition: JoinCondition = { table, type: 'left', on };
    if (alias) joinCondition.alias = alias;
    this.joinConditions.push(joinCondition);
    return this;
  }

  rightJoin(table: string, on: string, alias?: string): this {
    const joinCondition: JoinCondition = { table, type: 'right', on };
    if (alias) joinCondition.alias = alias;
    this.joinConditions.push(joinCondition);
    return this;
  }

  // Select with type inference
  select<S extends SelectFields<T>>(fields: S): SelectQueryBuilder<T, S> {
    return new SelectQueryBuilder(this, fields);
  }

  // Get all records
  async getMany(): Promise<T[]> {
    const query = this.buildSelectQuery();
    const rows = await this.executor.execute<Record<string, any>>(query);
    return mapRowsToEntities<T>(rows, this.fieldsDefinition);
  }

  // Get one record
  async getOne(): Promise<T | null> {
    const query = this.buildSelectQuery();
    const row = await this.executor.executeOne<Record<string, any>>(query);
    if (!row) return null;
    return mapColumnsToFields<T>(row, this.fieldsDefinition);
  }

  // Pluck a single field
  async pluck<K extends keyof T>(field: K): Promise<T[K][]> {
    const columnName = this.getColumnName(field as string);
    const query = this.buildSelectQuery([columnName]);
    const results = await this.executor.execute<Record<string, any>>(query);
    return results.map(row => row[columnName]);
  }

  // Update records
  async update(data: Partial<T>): Promise<T[]> {
    const query = this.buildUpdateQuery(data);
    const rows = await this.executor.execute<Record<string, any>>(query);
    return mapRowsToEntities<T>(rows, this.fieldsDefinition);
  }

  // Delete records
  async delete(): Promise<T[]> {
    const query = this.buildDeleteQuery();
    const rows = await this.executor.execute<Record<string, any>>(query);
    return mapRowsToEntities<T>(rows, this.fieldsDefinition);
  }

  // Count records
  async count(): Promise<number> {
    const query = this.buildCountQuery();
    const result = await this.executor.executeOne<{ count: string }>(query);
    return parseInt(result?.count || '0');
  }

  // Insert records
  async insert(data: Partial<T>): Promise<T> {
    const query = this.buildInsertQuery(data);
    const rows = await this.executor.execute<Record<string, any>>(query);
    return mapRowsToEntities<T>(rows, this.fieldsDefinition)[0];
  }

  // Insert multiple records
  async insertMany(data: Partial<T>[]): Promise<T[]> {
    const query = this.buildInsertManyQuery(data);
    const rows = await this.executor.execute<Record<string, any>>(query);
    return mapRowsToEntities<T>(rows, this.fieldsDefinition);
  }

  // Build SQL queries
  private buildSelectQuery(selectFields?: string[]): SQLQuery {
    let fields = '*';
    if (selectFields) {
      const mappedFields = selectFields.map(field => this.getColumnName(field));
      fields = mappedFields.join(', ');
    }
    let sql = `SELECT ${fields} FROM ${this.tableName}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add JOINs
    this.joinConditions.forEach(join => {
      const alias = join.alias ? ` AS ${join.alias}` : '';
      sql += ` ${join.type.toUpperCase()} JOIN ${join.table}${alias} ON ${join.on}`;
    });

    // Add WHERE conditions
    if (this.whereConditions.length > 0) {
      const whereClause = this.buildWhereClause(this.whereConditions, params, paramIndex);
      sql += ` WHERE ${whereClause.clause}`;
      paramIndex = whereClause.nextParamIndex;
    }

    // Add ORDER BY
    if (this.orderByConditions.length > 0) {
      const orderParts = this.orderByConditions.map(order => {
        if (typeof order === 'string') {
          const columnName = this.getColumnName(order);
          return `${columnName} ASC`;
        }
        return Object.entries(order).map(([field, direction]) => {
          const columnName = this.getColumnName(field);
          return `${columnName} ${direction.toUpperCase()}`;
        }).join(', ');
      });
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // Add LIMIT
    if (this.limitValue !== undefined) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(this.limitValue);
      paramIndex++;
    }

    // Add OFFSET
    if (this.offsetValue !== undefined) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(this.offsetValue);
      paramIndex++;
    }

    return { sql, params };
  }

  private buildUpdateQuery(data: Partial<T>): SQLQuery {
    const mappedData = mapFieldsToColumns(data, this.fieldsDefinition);
    const setClause = Object.keys(mappedData).map((key, index) => `${key} = $${index + 1}`).join(', ');
    let sql = `UPDATE ${this.tableName} SET ${setClause}`;
    const params: unknown[] = Object.values(mappedData);
    let paramIndex = params.length + 1;

    // Add WHERE conditions
    if (this.whereConditions.length > 0) {
      const whereClause = this.buildWhereClause(this.whereConditions, params, paramIndex);
      sql += ` WHERE ${whereClause.clause}`;
    }

    sql += ` RETURNING *`;
    return { sql, params };
  }

  private buildDeleteQuery(): SQLQuery {
    let sql = `DELETE FROM ${this.tableName}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add WHERE conditions
    if (this.whereConditions.length > 0) {
      const whereClause = this.buildWhereClause(this.whereConditions, params, paramIndex);
      sql += ` WHERE ${whereClause.clause}`;
    }

    sql += ` RETURNING *`;
    return { sql, params };
  }

  private buildCountQuery(): SQLQuery {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add WHERE conditions
    if (this.whereConditions.length > 0) {
      const whereClause = this.buildWhereClause(this.whereConditions, params, paramIndex);
      sql += ` WHERE ${whereClause.clause}`;
    }

    return { sql, params };
  }

  private buildInsertQuery(data: Partial<T>): SQLQuery {
    const mappedData = mapFieldsToColumns(data, this.fieldsDefinition);
    const columns = Object.keys(mappedData).join(', ');
    const values = Object.keys(mappedData).map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${values}) RETURNING *`;
    const params = Object.values(mappedData);
    
    return { sql, params };
  }

  private buildInsertManyQuery(data: Partial<T>[]): SQLQuery {
    if (data.length === 0) {
      throw new Error('Cannot insert empty data array');
    }
    
    // Map all data to columns first
    const mappedData = data.map(item => mapFieldsToColumns(item, this.fieldsDefinition));
    
    // Get all possible columns from all objects
    const allColumns = new Set<string>();
    mappedData.forEach(item => {
      Object.keys(item).forEach(col => allColumns.add(col));
    });
    const columns = Array.from(allColumns).sort(); // Sort for consistency
    
    // Ensure all objects have all columns (fill missing with null)
    const normalizedData = mappedData.map(item => {
      const normalized: Record<string, any> = {};
      columns.forEach(col => {
        normalized[col] = item.hasOwnProperty(col) ? item[col] : null;
      });
      return normalized;
    });
    
    const columnsStr = columns.join(', ');
    
    const valueRows = normalizedData.map((_, rowIndex) => {
      return `(${columns.map((_, colIndex) => `$${colIndex + 1 + rowIndex * columns.length}`).join(', ')})`;
    }).join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${columnsStr}) VALUES ${valueRows} RETURNING *`;
    const params = normalizedData.flatMap(item => columns.map(col => item[col]));
    
    return { sql, params };
  }

  private buildWhereClause(conditions: WhereCondition<T>[], params: unknown[], startIndex: number): { clause: string; nextParamIndex: number } {
    let paramIndex = startIndex;
    const clauses: string[] = [];

    conditions.forEach(condition => {
      const result = this.buildSingleCondition(condition, params, paramIndex);
      if (result.clause) {
        clauses.push(result.clause);
        paramIndex = result.nextParamIndex;
      }
    });

    return {
      clause: clauses.join(' AND '),
      nextParamIndex: paramIndex
    };
  }

  private buildSingleCondition(condition: WhereCondition<T>, params: unknown[], paramIndex: number): { clause: string; nextParamIndex: number } {
    // Handle logical operators
    if ('AND' in condition && condition.AND) {
      const andClauses: string[] = [];
      let currentParamIndex = paramIndex;
      
      condition.AND.forEach(subCondition => {
        const result = this.buildSingleCondition(subCondition, params, currentParamIndex);
        if (result.clause) {
          andClauses.push(result.clause);
          currentParamIndex = result.nextParamIndex;
        }
      });

      return {
        clause: andClauses.length > 0 ? `(${andClauses.join(' AND ')})` : '',
        nextParamIndex: currentParamIndex
      };
    }

    if ('OR' in condition && condition.OR) {
      const orClauses: string[] = [];
      let currentParamIndex = paramIndex;
      
      condition.OR.forEach(subCondition => {
        const result = this.buildSingleCondition(subCondition, params, currentParamIndex);
        if (result.clause) {
          orClauses.push(result.clause);
          currentParamIndex = result.nextParamIndex;
        }
      });

      return {
        clause: orClauses.length > 0 ? `(${orClauses.join(' OR ')})` : '',
        nextParamIndex: currentParamIndex
      };
    }

    // Handle regular field conditions
    const conditionClauses: string[] = [];
    let currentParamIndex = paramIndex;

    Object.entries(condition).forEach(([field, value]) => {
      // Skip logical operators
      if (field === 'AND' || field === 'OR') return;
      
      const columnName = this.getColumnName(field);
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle operators like { gt: 10 }
          Object.entries(value).forEach(([operator, operatorValue]) => {
            const sqlOperator = this.getSQLOperator(operator);
            if (operator === 'in' || operator === 'notIn') {
              const placeholders = (operatorValue as unknown[]).map(() => `$${currentParamIndex++}`).join(', ');
              conditionClauses.push(`${columnName} ${sqlOperator} (${placeholders})`);
              params.push(...(operatorValue as unknown[]));
            } else if (operator === 'isNull' || operator === 'isNotNull') {
              conditionClauses.push(`${columnName} ${sqlOperator}`);
            } else {
              conditionClauses.push(`${columnName} ${sqlOperator} $${currentParamIndex++}`);
              params.push(operatorValue);
            }
          });
        } else {
          // Simple equality
          conditionClauses.push(`${columnName} = $${currentParamIndex++}`);
          params.push(value);
        }
      }
    });

    return {
      clause: conditionClauses.length > 0 ? conditionClauses.join(' AND ') : '',
      nextParamIndex: currentParamIndex
    };
  }

  private getSQLOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'eq': '=',
      'ne': '!=',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'like': 'LIKE',
      'ilike': 'ILIKE',
      'in': 'IN',
      'notIn': 'NOT IN',
      'isNull': 'IS NULL',
      'isNotNull': 'IS NOT NULL'
    };
    return operatorMap[operator] || '=';
  }
}

// Specialized query builder for select operations with type inference
export class SelectQueryBuilder<T, S extends SelectFields<T>> {
  constructor(
    private baseQuery: QueryBuilder<T>,
    private selectFields: S
  ) {}

  async getMany(): Promise<SelectedType<T, S>[]> {
    const fieldNames = Object.keys(this.selectFields).filter(key => this.selectFields[key as keyof S]);
    const columnNames = fieldNames.map(field => (this.baseQuery as any).getColumnName(field));
    const query = (this.baseQuery as any).buildSelectQuery(columnNames);
    const executor = (this.baseQuery as any).executor as QueryExecutor;
    const rows = await executor.execute<Record<string, any>>(query);
    const fieldsDefinition = (this.baseQuery as any).fieldsDefinition;
    return mapRowsToEntities<SelectedType<T, S>>(rows, fieldsDefinition);
  }

  async getOne(): Promise<SelectedType<T, S> | null> {
    const fieldNames = Object.keys(this.selectFields).filter(key => this.selectFields[key as keyof S]);
    const columnNames = fieldNames.map(field => (this.baseQuery as any).getColumnName(field));
    const query = (this.baseQuery as any).buildSelectQuery(columnNames);
    const executor = (this.baseQuery as any).executor as QueryExecutor;
    const row = await executor.executeOne<Record<string, any>>(query);
    if (!row) return null;
    const fieldsDefinition = (this.baseQuery as any).fieldsDefinition;
    return mapColumnsToFields<SelectedType<T, S>>(row, fieldsDefinition);
  }
}
