import { type AnyKysely, sql } from "@/deps.ts";

export async function up(db: AnyKysely): Promise<void> {
  await sql`select 1`.execute(db);
}

export async function down(db: AnyKysely): Promise<void> {
  // nothing
}
