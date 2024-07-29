import { type Kysely, sql } from "kysely";
import { expandGlob } from "jsr:@std/fs/expand-glob";

import type { ElwoodDatabaseTables } from "../src/types.ts";

export async function seed(
  db: Kysely<ElwoodDatabaseTables>,
  __dirname: string,
) {
  // seed
  const seedFiles = await Array.fromAsync(
    expandGlob(`${__dirname}/../seed/*.ts`),
  );

  for (const file of seedFiles) {
    if (file.name.startsWith("_")) {
      console.log(`skipping ${file.name}...`);
      continue;
    }

    const { seed } = await import(`file://${file.path}`);
    console.log(`seeding ${file.name}...`);
    await seed(db.withSchema("elwood"), sql);
  }
}
