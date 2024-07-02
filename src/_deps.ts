import { Kysely as K } from "npm:kysely";

export { sql } from "npm:kysely";

// deno-lint-ignore no-explicit-any -- intentionally using any
export type Kysely = K<any>;
