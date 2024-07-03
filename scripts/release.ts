#!/usr/bin/env -S deno run --allow-run --allow-net --allow-env --allow-read --allow-write

// deno-lint-ignore-file

/**
 * release.ts
 *
 * This script generates a new release for the db control. It will
 * 1. squash all migrations into a single migration file
 * 2. read the latest release from `elwood.control`
 * 3. write squashed to the the `elwood--${version}.sql` file
 * 4. update the `elwood.control` with latest version
 * 5. write a new `latest.json` file with the full release
 *
 * Docs: https://elwood.software/docs/db
 * Have questions, email us at hello@elwood.software
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSync } from "https://deno.land/std@0.220.1/dotenv/mod.ts";
import * as semver from "https://deno.land/std@0.224.0/semver/mod.ts";
import { parseArgs } from "https://deno.land/std@0.224.0/cli/mod.ts";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  DatabaseConnection,
  FileMigrationProvider,
  Generated,
  Kysely,
  Migrator,
  PostgresAdapter,
  PostgresDialect,
  PostgresIntrospector,
  PostgresQueryCompiler,
  QueryResult,
} from "npm:kysely";

import { DummyDriver } from "./db.ts";

const args = parseArgs(Deno.args, {
  boolean: ["overwrite"],
});
const versionFileTemplate = "elwood--${version}.sql";
const ignoreMigrations: RegExp[] = [];

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");

loadSync({
  envPath,
  export: true,
});

const rootDir = join(__dirname, "..");
const migrationsDir = join(rootDir, "src/migrations");
const versionsDir = join(rootDir, "versions");

const latestVersion = JSON.parse(
  await Deno.readTextFile(join(versionsDir, "latest.json")),
) as {
  version: string;
  sql: string;
  migrations: string[];
};

const controlData = await Deno.readTextFile(join(rootDir, "elwood.control"));
const defaultVersion =
  Array.from(controlData.match(/default_version = '(.*)'/) ?? [])[1];
let nextVersion = semver.format(
  semver.increment(semver.parse(defaultVersion), "minor"),
);

if (args.overwrite === true) {
  nextVersion = defaultVersion;
}

if (args.overwrite === false) {
  try {
    await Deno.stat(join(versionsDir, `${nextVersion}.json`));
    console.log(
      `Version ${nextVersion} already exists. Use --overwrite to overwrite.`,
    );
    Deno.exit(1);
  } catch (_) {
    // do nothing
  }
}

const driver = new DummyDriver();
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

const migrations = new FileMigrationProvider({
  fs,
  path,
  // This needs to be an absolute path.
  migrationFolder: path.join(__dirname, "../src/migrations"),
});

const migrationNames: string[] = [];
const sql: string[] = [];

for (
  const [name, migration] of Object.entries(await migrations.getMigrations())
) {
  migrationNames.push(name);

  if (latestVersion.migrations.includes(name)) {
    continue;
  }

  driver.reset();
  await migration.up(db);

  sql.push(`-- src:${name}\n${driver.sql.join("\n")}\n--\n\n`);
}

if (sql.length === 0) {
  console.error("No migrations from last version to this version");
  Deno.exit(1);
}

// write the squashed migrations to the version file
await Deno.writeFile(
  join(
    rootDir,
    versionFileTemplate.replace("${version}", nextVersion),
  ),
  new TextEncoder().encode(sql.join("\n")),
);

// update the control file with the new version
await Deno.writeFile(
  join(
    rootDir,
    "elwood.control",
  ),
  new TextEncoder().encode(
    controlData.replace(defaultVersion, nextVersion),
  ),
);

const versionData = {
  version: nextVersion,
  sql: sql.join("\n"),
  migrations: migrationNames,
};

// write the latest version file to the versions dir
await Deno.writeFile(
  join(
    versionsDir,
    "latest.json",
  ),
  new TextEncoder().encode(
    JSON.stringify(
      versionData,
      null,
      2,
    ),
  ),
);

// write this version file to the versions dir
await Deno.writeFile(
  join(
    versionsDir,
    `${nextVersion}.json`,
  ),
  new TextEncoder().encode(
    JSON.stringify(
      versionData,
      null,
      2,
    ),
  ),
);
