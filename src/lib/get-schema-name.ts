import { Kysely } from "../deps.ts";

export function getSchemaName(db: Kysely): string {
  let name = "public";
  db.schema.createTable("test").$call((b) => {
    name = b.toOperationNode().table.table.schema?.name ?? "public";
  });

  return name;
}
