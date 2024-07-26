import { Kysely, sql } from "../deps.ts";

export type CreateFunctionArgs = Array<
  [string, string] | [string, string, string]
>;

export type CreateFunctionInput = {
  name: string;
  body: string;
  args?: CreateFunctionArgs;
  declare?: string[];
  returns?: string;
  securityDefiner?: boolean;
  schema?: string;
};

export async function createFunction(
  db: Kysely,
  input: CreateFunctionInput,
): Promise<void> {
  let name = "public";
  db.schema.createTable("test").$call((b) => {
    name = b.toOperationNode().table.table.schema?.name ?? "public";
  });

  if (input.schema) {
    name = input.schema;
  }

  const args = input.args ?? [];
  const declare = (input.declare ?? []).map((item) => {
    return item.endsWith(";") ? item : `${item};`;
  });
  const returns = input.returns ?? "void";

  const nameWithSchema = `${name}.${input.name}`;
  const types = args.map(([_, type]) => `${type}`).join(", ");
  const argDefs = args.map(([name, type, defaultTo]) => {
    if (defaultTo) {
      return `${name} ${type} DEFAULT ${defaultTo}`;
    }

    return `${name} ${type}`;
  }).join(", ");

  await sql`DROP FUNCTION IF EXISTS ${sql.raw(nameWithSchema)}(${
    sql.raw(types)
  }) CASCADE;`.execute(db);

  const q = sql`CREATE function ${sql.raw(nameWithSchema)}(${sql.raw(argDefs)})
      RETURNS ${sql.raw(returns)}
      LANGUAGE plpgsql
      ${input.securityDefiner ? sql.raw("SECURITY DEFINER") : sql.raw("")}
      as $$
      declare
        ${sql.raw(declare.join("\n"))}
      begin
        ${sql.raw(input.body)}
      end;
      $$;
  `;

  await q.execute(db);
}
