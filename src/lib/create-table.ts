// deno-lint-ignore-file no-explicit-any
import { type CreateTableBuilder, type Kysely, sql } from "../deps.ts";

export type CreateTableBuilderFn = (
  table: CreateTableBuilder<any, any>,
  db: Kysely,
) => CreateTableBuilder<any, any>;

export type CreateTableOptions = {
  addRls?: boolean;
  addInstanceId?: boolean;
};

export async function createTable(
  db: Kysely,
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

  console.log(tbl_.compile().sql);

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
}
