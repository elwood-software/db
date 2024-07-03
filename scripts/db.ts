import {
  CompiledQuery,
  DatabaseConnection,
  Driver,
  QueryResult,
} from "npm:kysely";

export class DummyDriver implements Driver {
  public sql: string[] = [];

  reset() {
    this.sql = [];
  }

  async init(): Promise<void> {
    // Nothing to do here.
  }

  // deno-lint-ignore require-await
  async acquireConnection(): Promise<DatabaseConnection> {
    return new DummyConnection(this);
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

class DummyConnection implements DatabaseConnection {
  constructor(protected readonly driver: DummyDriver) {
  }

  async executeQuery<R>(q: CompiledQuery): Promise<QueryResult<R>> {
    this.driver.sql.push(q.sql);
    return {
      rows: [],
    };
  }

  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    // Nothing to do here.
  }
}
