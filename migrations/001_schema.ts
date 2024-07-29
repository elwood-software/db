import { type AnyKysely, sql } from "@/deps.ts";

export async function up(db: AnyKysely): Promise<void> {
  const createSchema = [
    sql`CREATE SCHEMA IF NOT EXISTS elwood;`,
    sql`grant usage on schema elwood to postgres, anon, authenticated, service_role;`,
    sql`alter default privileges in schema elwood grant all on tables to postgres, anon, authenticated, service_role;`,
    sql`alter default privileges in schema elwood grant all on functions to postgres, anon, authenticated, service_role;`,
    sql`alter default privileges in schema elwood grant all on sequences to postgres, anon, authenticated`,
  ];

  for (const query of createSchema) {
    await query.execute(db);
  }
}

export async function down(db: AnyKysely): Promise<void> {
  await db.schema.dropSchema("elwood").ifExists().execute();
}
