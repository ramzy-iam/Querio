import { generateCreateTableSQL } from "./schema";
import { ModelConfiguration } from "./modelRegistry";
import { QueryExecutor } from "../types";

export interface MigrationOptions {
  dropIfExists?: boolean;
  schema?: string;
}

export class Migration {
  private executor: QueryExecutor;

  constructor(executor: QueryExecutor) {
    this.executor = executor;
  }

  async createTable(
    config: ModelConfiguration,
    options: MigrationOptions = {}
  ): Promise<void> {
    const sql = generateCreateTableSQL(
      config.table,
      config.fields,
      options,
      config.constraints
    );

    await this.executor.execute({ sql, params: [] });
    console.log(`✅ Table '${config.table}' created successfully`);
  }

  async createTables(
    models: Array<{ config: ModelConfiguration }>,
    options: MigrationOptions = {}
  ): Promise<void> {
    console.log("🏗️ Creating tables...");

    for (const { config } of models) {
      try {
        await this.createTable(config, options);
      } catch (error) {
        console.error(`❌ Failed to create table '${config.table}':`, error);
        throw error;
      }
    }

    console.log("✅ All tables created successfully");
  }

  async dropTable(tableName: string, schema?: string): Promise<void> {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    const sql = `DROP TABLE IF EXISTS ${fullTableName} CASCADE`;

    await this.executor.execute({ sql, params: [] });
    console.log(`🗑️ Table '${fullTableName}' dropped`);
  }

  async addConstraint(
    tableName: string,
    constraintName: string,
    constraintDefinition: string,
    schema?: string
  ): Promise<void> {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    const sql = `ALTER TABLE ${fullTableName} ADD CONSTRAINT ${constraintName} ${constraintDefinition}`;

    await this.executor.execute({ sql, params: [] });
    console.log(
      `✅ Constraint '${constraintName}' added to '${fullTableName}'`
    );
  }

  async dropConstraint(
    tableName: string,
    constraintName: string,
    schema?: string
  ): Promise<void> {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    const sql = `ALTER TABLE ${fullTableName} DROP CONSTRAINT IF EXISTS ${constraintName}`;

    await this.executor.execute({ sql, params: [] });
    console.log(
      `🗑️ Constraint '${constraintName}' dropped from '${fullTableName}'`
    );
  }
}
