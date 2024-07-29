// deno-lint-ignore-file no-explicit-any
import { type AnyKysely, type CreateTableBuilder, sql } from "@/deps.ts";

import { createTrigger } from "@/lib/create-trigger.ts";

export type CreateTableBuilderFn = (
  table: CreateTableBuilder<any, any>,
  db: AnyKysely,
) => CreateTableBuilder<any, any>;

export type CreateTableOptions = {
  addRls?: boolean;
  addInstanceId?: boolean;
};

export async function createTable(
  db: AnyKysely,
  tableName: string,
  builder: CreateTableBuilderFn,
  options: CreateTableOptions = {},
): Promise<void> {
  let name = "public";
  db.schema.createTable("test").$call((b) => {
    name = b.toOperationNode().table.table.schema?.name ?? "public";
  });

  let tbl = db.schema.createTable(tableName);

  if (options.addInstanceId !== false) {
    tbl = tbl.addColumn(
      "instance_id",
      "uuid",
      (col) => col.notNull().defaultTo(sql`elwood.current_instance_id()`),
    );
  }

  // build the table
  const tbl_ = builder(tbl, db);

  const hasMetadataCol = tbl_.toOperationNode().columns.find((col) =>
    col.column.column.name === "metadata"
  );
  const hasUpdatedAtCol = tbl_.toOperationNode().columns.find((col) =>
    col.column.column.name === "updated_at"
  );

  await tbl_.execute();

  // add rls
  if (options.addRls !== false) {
    await sql`alter table ${sql.id(name)}.${
      sql.id(tableName)
    } enable row level security`
      .execute(
        db,
      );
  }

  if (hasMetadataCol) {
    await createTrigger(db, {
      when: "BEFORE",
      event: ["UPDATE"],
      table: tableName,
      name: `set_metadata`,
      args: [],
      body: `
          NEW.metadata = OLD.metadata || COALESCE(NEW.metadata, '{}');      
          return NEW;
      `,
    });
  }

  if (hasUpdatedAtCol) {
    await createTrigger(db, {
      when: "BEFORE",
      event: ["UPDATE"],
      table: tableName,
      name: `set_updated_at`,
      args: [],
      body: `
          NEW.updated_at = now();
          return NEW;
      `,
    });
  }
}
