import { Kysely as K } from "npm:kysely";

export {
  type AliasedExpression,
  AliasNode,
  AlterTableBuilder,
  CreateTableBuilder,
  type Expression,
  IdentifierNode,
  type OperationNode,
  sql,
} from "npm:kysely";

// deno-lint-ignore no-explicit-any -- intentionally using any
export type Kysely = K<any>;
