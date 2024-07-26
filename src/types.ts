import type {
  ColumnType,
  Generated,
  Insertable,
  Kysely,
  QueryCreator as KQueryCreator,
  Selectable,
  Updateable,
} from "./deps.ts";
import type { NodeStatus, NodeType } from "./constants.ts";

// deno-lint-ignore no-explicit-any
export type JsonScalar = any;
export type JsonObject = Record<string, JsonScalar>;

export type ElwoodDatabase = Kysely<ElwoodDatabaseTables>;
export type ElwoodQueryCreator = KQueryCreator<ElwoodDatabaseTables>;

export type PublicDatabase = Kysely<PublicTables>;
export type PublicQueryCreator = KQueryCreator<PublicTables>;

export type PublicTables = {
  elwood_studio_node: StudioNodeTable;
};

export type ElwoodDatabaseTables = {
  nodes: NodeTable;
};

export type NodeTable = {
  instance_id: string;
  id: Generated<string>;
  parent_id: string | null;
  status: NodeStatus;
  name: string;
  type: NodeType;
  category_id: string;
  sub_category_id: string;
  metadata: JsonObject;
  data: JsonObject;
  version: number;
  publish_at: ColumnType<Date | null, Date | null, Date | null>;
  unpublish_at: ColumnType<Date | null, Date | null, Date | null>;
};

export type Node = Selectable<NodeTable>;
export type NewNode = Insertable<NodeTable>;
export type UpdateNode = Updateable<NodeTable>;

export type StudioNodeTable = {
  id: string;
  name: string;
  parent_id: string | null;
  category_id: string;
  sub_category_id: string | null;
  category: string;
  sub_category: string | null;
  content: JsonObject & {
    __elwood_node_id: string;
    __elwood_node_name: string;
  };
};

export type StudioNode = Selectable<StudioNodeTable>;
