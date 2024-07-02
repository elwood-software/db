import { type Kysely, sql } from "./_deps.ts";

export async function up(db: Kysely): Promise<void> {
  await db.schema.createTable("node")
    .addColumn(
      "id",
      "uuid",
      (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .execute();
}

export async function down(db: Kysely): Promise<void> {
  await sql`DROP SCHEMA IF EXISTS elwood CASCADE;`.execute(db);
}
