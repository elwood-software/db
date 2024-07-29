import { AnyKysely, sql } from "@/deps.ts";
import { getSchemaName } from "@/lib/get-schema-name.ts";

export type CreatePolicyOptions = {
  name: string;
  tableName: string;
  as?: "RESTRICTIVE" | "PERMISSIVE";
  for?: "All" | Array<"SELECT" | "INSERT" | "UPDATE" | "DELETE">;
  roles: string[];
  using?: string;
  check?: string;
};

export async function createPolicy(
  db: AnyKysely,
  options: CreatePolicyOptions,
) {
  const schema = getSchemaName(db);
  const { tableName, as = "PERMISSIVE", roles, using = "(true)" } = options;
  const for_ = (options.for ?? "ALL") === "ALL"
    ? "ALL"
    : Array.from(options.for as string[]).join(", ");

  await sql`
    create policy "${name}"
    on "${schema}"."${tableName}"
    as ${as}
    for ${for_}
    to ${roles.join(", ")}
    using ${sql.raw(using)}
    ${options.check ? sql`with check (${options.check})` : sql``}
    ;
  `.execute(db);
}
