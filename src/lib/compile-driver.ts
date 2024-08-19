import type {
  CompiledQuery,
  DatabaseConnection,
  Driver,
  QueryResult,
} from "@/deps.ts";

export class CompileDriver implements Driver {
  public sql: string[] = [];

  reset() {
    this.sql = [];
  }

  async init(): Promise<void> {
    // Nothing to do here.
  }

  // deno-lint-ignore require-await
  async acquireConnection(): Promise<DatabaseConnection> {
    return new CompileConnection(this);
  }

  async beginTransaction(): Promise<void> {
    // Nothing to do here.
  }

  async commitTransaction(): Promise<void> {
    // Nothing to do here.
  }

  async rollbackTransaction(): Promise<void> {
    // Nothing to do here.
  }

  async releaseConnection(): Promise<void> {
    // Nothing to do here.
  }

  async destroy(): Promise<void> {
    // Nothing to do here.
  }
}

class CompileConnection implements DatabaseConnection {
  constructor(protected readonly driver: CompileDriver) {
  }

  async executeQuery<R>(q: CompiledQuery): Promise<QueryResult<R>> {
    this.driver.sql.push(q.sql);
    return await Promise.resolve({
      rows: [],
    });
  }

  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    // Nothing to do here.
  }
}
