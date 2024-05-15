#!/usr/bin/env -S deno run --allow-run --allow-net --allow-env --allow-read --allow-write

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
const migrationsDir = join(rootDir, "supabase/migrations");
const versionsDir = join(rootDir, "versions");

const controlData = await Deno.readTextFile(join(rootDir, "elwood.control"));
const defaultVersion =
  Array.from(controlData.match(/default_version = '(.*)'/) ?? [])[1];
let nextVersion = semver.format(
  semver.increment(semver.parse(defaultVersion), "patch"),
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

const sqlFiles: string[] = [];
const toSquash: string[] = [];

for await (const dirEntry of Deno.readDir(migrationsDir)) {
  if (dirEntry.isFile && !ignoreMigrations.some((r) => r.test(dirEntry.name))) {
    sqlFiles.push(dirEntry.name);
  }
}

sqlFiles.sort();

for (const sqlFileName of sqlFiles) {
  toSquash.push(await Deno.readTextFile(join(migrationsDir, sqlFileName)));
}

// write the squashed migrations to the version file
await Deno.writeFile(
  join(
    rootDir,
    versionFileTemplate.replace("${version}", nextVersion),
  ),
  new TextEncoder().encode(toSquash.join("\n")),
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

// write the latest version file to the versions dir
await Deno.writeFile(
  join(
    versionsDir,
    "latest.json",
  ),
  new TextEncoder().encode(
    JSON.stringify(
      {
        version: nextVersion,
        sql: toSquash.join("\n"),
      },
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
      {
        version: nextVersion,
        sql: toSquash.join("\n"),
      },
      null,
      2,
    ),
  ),
);
