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
import { parseArgs } from "https://deno.land/std@0.224.0/cli/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

const args = parseArgs(Deno.args, {});

const ignoreMigrations: RegExp[] = [];

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");

loadSync({
  envPath,
  export: true,
});

const rootDir = join(__dirname, "..");
const migrationsDir = join(rootDir, "supabase/migrations");

export async function compile(version: string): Promise<string> {
  const sqlFiles: string[] = [];
  const toSquash: string[] = [];

  for await (const dirEntry of Deno.readDir(migrationsDir)) {
    if (
      dirEntry.isFile && !ignoreMigrations.some((r) => r.test(dirEntry.name))
    ) {
      sqlFiles.push(dirEntry.name);
    }
  }

  sqlFiles.sort();

  for (const sqlFileName of sqlFiles) {
    toSquash.push(await Deno.readTextFile(join(migrationsDir, sqlFileName)));
  }

  return toSquash.join("\n\n").replace("$$ELWOOD_PTLE_VERSION$$", version);
}

if (import.meta.main) {
  assert(args.version, "Version is required");
  console.log(await compile(args.version));
}
