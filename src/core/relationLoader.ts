import { QueryExecutor } from "../types";
import { WithRelations } from "./relations";

export class RelationLoader {
  constructor(private executor: QueryExecutor) {}

  async loadRelations<T>(
    entities: T[],
    _relationIncludes: WithRelations<T>
  ): Promise<T[]> {
    // For now, return entities as-is
    // TODO: Implement actual relation loading logic
    console.log(
      `Relation loading not yet implemented. Using executor:`,
      !!this.executor
    );
    return entities;
  }
}
