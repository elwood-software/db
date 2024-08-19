import { promises as fs } from "node:fs";
import * as path from "node:path";
import { expandGlob } from "jsr:@std/fs/expand-glob";
import * as semver from "https://deno.land/std@0.224.0/semver/mod.ts";

import { CompileDriver } from "@/lib/compile-driver.ts";
import {
  FileMigrationProvider,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
} from "@/deps.ts";

export type CompileOptions = {
  rootDir: string;
  migrationFolder: string;
};

export async function compile(
  options: CompileOptions,
) {
  const driver = new CompileDriver();
  const db = new Kysely<any>({
    dialect: {
      createAdapter() {
        return new PostgresAdapter();
      },
      createDriver() {
        // You need a driver to be able to execute queries. In this example
        // we use the dummy driver that never does anything.
        return driver;
      },
      createIntrospector(db: Kysely<unknown>) {
        return new PostgresIntrospector(db);
      },
      createQueryCompiler() {
        return new PostgresQueryCompiler();
      },
    },
  }).withSchema("elwood");

  const versionFolders = await Array.fromAsync(
    expandGlob(`${options.migrationFolder}/v*`, { includeDirs: true }),
  );

  // all version
  const sql: { value: string; version: string }[] = [];
  const version: string[] = [];

  for (const folder of versionFolders) {
    if (!folder.isDirectory) {
      continue;
    }

    version.push(folder.name);

    const migrations = new FileMigrationProvider({
      fs,
      path,
      migrationFolder: folder.path,
    });

    console.log(
      "Compiling migrations...",
      path.relative(options.migrationFolder, folder.path),
    );

    for (
      const [name, migration] of Object.entries(
        await migrations.getMigrations(),
      )
    ) {
      driver.reset();
      await migration.up(db);

      sql.push({
        version: folder.name,
        value: `-- src:${name}\n${driver.sql.join("\n")}\n--\n\n`,
      });
    }
  }

  version.sort();

  // open control and get the last version

  const controlData = await Deno.readTextFile(
    path.join(options.rootDir, "elwood.control"),
  );
  const defaultVersion =
    Array.from(controlData.match(/default_version = '(.*)'/) ?? [])[1];
}
