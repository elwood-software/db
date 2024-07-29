import type { AnyKysely } from "@/deps.ts";

export function getSchemaName(db: AnyKysely, fallback = "public"): string {
  let name = fallback;
  db.schema.createTable("test").$call((b) => {
    name = b.toOperationNode().table.table.schema?.name ?? fallback;
  });

  return name;
}
