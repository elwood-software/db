import type { Kysely } from "../deps.ts";

export function getSchemaName(db: Kysely, fallback = "public"): string {
  let name = fallback;
  db.schema.createTable("test").$call((b) => {
    name = b.toOperationNode().table.table.schema?.name ?? fallback;
  });

  return name;
}
