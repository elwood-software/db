import { type Kysely, sql } from "./_deps.ts";

export async function up(db: Kysely): Promise<void> {
  const schema = [
    sql`CREATE SCHEMA IF NOT EXISTS elwood;`,
    sql`grant usage on schema elwood to postgres, anon, authenticated, service_role;`,
    sql`alter default privileges in schema elwood grant all on tables to postgres, anon, authenticated, service_role;`,
    sql`alter default privileges in schema elwood grant all on functions to postgres, anon, authenticated, service_role;`,
    sql`alter default privileges in schema elwood grant all on sequences to postgres, anon, authenticated`,
  ];

  for (const query of schema) {
    await query.execute(db);
  }
}

export async function down(db: Kysely): Promise<void> {
  await sql`DROP SCHEMA IF EXISTS elwood CASCADE;`.execute(db);
}
