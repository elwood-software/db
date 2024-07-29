import { type Kysely, sql } from "@/deps.ts";
import { createFunction } from "@/lib/create-function.ts";

export async function up(db: Kysely<any>): Promise<void> {
  await createFunction(db, {
    name: "current_instance_id",
    returns: "uuid",
    declare: [
      "instance_id uuid;",
    ],
    body: `
      select (auth.jwt()->>'instance_id')::uuid into instance_id;

      IF instance_id IS NULL THEN 
        return '00000000-0000-0000-0000-000000000000'::uuid;
      END IF; 

      return instance_id;
    `,
  });
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS elwood.current_instance_id() CASCADE`
    .execute(db);
}
