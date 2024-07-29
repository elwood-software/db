import { type AnyKysely, sql } from "@/deps.ts";

import type { CreateFunctionInput } from "@/lib/create-function.ts";
import { createFunction } from "@/lib/create-function.ts";
import { getSchemaName } from "@/lib/get-schema-name.ts";

export type CreateTriggerInput = CreateFunctionInput & {
  table: string;
  event: Array<"INSERT" | "UPDATE" | "DELETE">;
  when: "BEFORE" | "AFTER";
};

export async function createTrigger(db: AnyKysely, input: CreateTriggerInput) {
  const { event, when, table, name, ...fnInput } = input;
  const schema = getSchemaName(db, input.schema);

  const triggerName = `trigger_${table}_${when}_${name}`
    .toLocaleLowerCase();
  const triggerFnName = `${triggerName}_fn`;

  await createFunction(db, {
    ...fnInput,
    schema,
    returns: "TRIGGER",
    name: triggerFnName,
  });

  for (const e of event) {
    const triggerName_ = `${triggerName}_${e.toLowerCase()}`;

    const sth = sql`
      CREATE TRIGGER ${sql.raw(`"${triggerName_}"`)}
      ${sql.raw(`${when} ${e} ON ${schema}.${table}`)}
      FOR EACH ROW EXECUTE FUNCTION ${sql.id(schema, triggerFnName)}();
    `;

    await sth.execute(db);
  }
}
