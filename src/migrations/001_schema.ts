import { type Kysely, sql } from "../deps.ts";

export async function up(db: Kysely): Promise<void> {
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

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropSchema("elwood").ifExists().execute();
}
