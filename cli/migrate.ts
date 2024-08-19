import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  FileMigrationProvider,
  type Kysely,
  Migrator,
  NO_MIGRATIONS,
  sql,
} from "kysely";
import { expandGlob } from "jsr:@std/fs/expand-glob";

import { VersionFileMigrationProvider } from "@/lib/migration-provider.ts";
import type { ElwoodDatabaseTables } from "@/types.ts";

export async function migrate(
  db: Kysely<ElwoodDatabaseTables>,
  __dirname: string,
  subCommand: string,
): Promise<void> {
  switch (subCommand) {
    case "up":
      await up();
      break;
    case "down":
      await down();
      break;
    case "reset":
      await sql`DROP SCHEMA IF EXISTS elwood CASCADE`.execute(db);
      await up();

      break;
  }

  async function up() {
    const hasElwoodSchema = (await db.introspection.getSchemas()).map((it) =>
      it.name
    ).includes("elwood");

    if (!hasElwoodSchema) {
      console.log(' no "elwood" schema found, creating it');
      await db.schema.createSchema("elwood").execute();
    }

    const migrator = new Migrator({
      db: db.withSchema("elwood"),
      provider: new VersionFileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, "../migrations"),
      }),
    });

    await migrator.migrateTo(NO_MIGRATIONS);
    await migrator.migrateToLatest();

    const { error: error_, results } = await migrator.migrateToLatest();

    console.log("Migration results:");

    if (error_) {
      throw error_;
    }

    results?.forEach((it) => {
      if (it.status === "Success") {
        console.log(
          `migration "${it.migrationName}" was executed successfully`,
        );
      } else if (it.status === "Error") {
        console.error(`failed to execute migration "${it.migrationName}"`);
      }
    });
  }

  async function down() {
  }
}
