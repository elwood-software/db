import type { Kysely } from "npm:kysely";
import type {
  ColumnType,
  Generated,
  Insertable,
  QueryCreator,
  Selectable,
  Updateable,
} from "./deps.ts";
import type {
  NodeStatus,
  NodeType,
  StudioPlanStatus,
  StudioSubscriptionStatus,
  StudioWebhookDirection,
} from "./constants.ts";
import { TupleNode } from "kysely";

// deno-lint-ignore no-explicit-any
export type JsonScalar = any;
export type JsonObject = Record<string, JsonScalar>;

export type JsonOrNull<T extends JsonObject> = JsonObject & Partial<T> | null;

/**
 * Elwood Schema
 */

export type ElwoodDatabase = Kysely<ElwoodDatabaseTables>;
export type ElwoodQueryCreator = QueryCreator<ElwoodDatabaseTables>;

export type ElwoodDatabaseTables = {
  node: NodeTable;
  studio_plan: StudioPlanTable;
  studio_subscription: StudioSubscriptionTable;
  studio_customer: StudioCustomerTable;
  studio_node_plan: StudioNodePlanTable;
  studio_webhook: StudioWebhookTable;
};

export type NodeTable = {
  instance_id: ColumnType<string, string | null, never>;
  id: Generated<string>;
  parent_id: string | null;
  status: NodeStatus;
  name: string;
  type: NodeType;
  category_id: string;
  sub_category_id: string | null;
  other_categories: string[];
  metadata: JsonObject | null;
  data: JsonObject | null;
  version: number | null;
  publish_at: ColumnType<Date | null, Date | null, Date | null>;
  unpublish_at: ColumnType<Date | null, Date | null, Date | null>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, never>;
};

export type Node = Selectable<NodeTable>;
export type NewNode = Insertable<NodeTable>;
export type UpdateNode = Updateable<NodeTable>;

export type StudioPlanTable = {
  instance_id: ColumnType<string, string | null, never>;
  id: Generated<string>;
  metadata: JsonOrNull<{
    stripe_id: string | null;
  }>;
  name: string;
  description: string | null;
  status: StudioPlanStatus;
  prices:
    | Array<
      JsonObject & {
        id: string;
        stripe_id?: string;
      }
    >
    | null;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, never>;
};

export type StudioPlan = Selectable<StudioPlanTable>;
export type NewStudioPlan = Insertable<StudioPlanTable>;
export type UpdateStudioPlan = Updateable<StudioPlanTable>;

export type StudioSubscriptionTable = {
  instance_id: ColumnType<string, string | null, never>;
  id: Generated<string>;
  customer_id: string;
  plan_id: string;
  node_id: string;
  metadata: JsonOrNull<{
    stripe_id?: string | null;
  }>;
  status: StudioSubscriptionStatus;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, never>;
};

export type StudioSubscription = Selectable<StudioSubscriptionTable>;
export type NewStudioSubscription = Insertable<StudioSubscriptionTable>;
export type UpdateStudioSubscription = Updateable<StudioSubscriptionTable>;

export type StudioCustomerTable = {
  instance_id: ColumnType<string, string | null, never>;
  id: Generated<string>;
  user_id: string;
  email: string;
  metadata: JsonOrNull<{
    name: string | null;
    stripe_id: string | null;
  }>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, never>;
};

export type StudioCustomer = Selectable<StudioCustomerTable>;
export type NewStudioCustomer = Insertable<StudioCustomerTable>;
export type UpdateStudioCustomer = Updateable<StudioCustomerTable>;

export type StudioNodePlanTable = {
  instance_id: ColumnType<string, string | null, never>;
  id: Generated<string>;
  node_id: string;
  plan_id: string;
  metadata: JsonOrNull<{
    stripe_price_id: string | null;
  }>;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, never, never>;
};

export type StudioNodePlan = Selectable<StudioNodePlanTable>;
export type NewStudioNodePlan = Insertable<StudioNodePlanTable>;
export type UpdateStudioNodePlan = Updateable<StudioNodePlanTable>;

export type StudioWebhookTable = {
  id: Generated<string>;
  reference_id: string;
  source: string;
  is_processed: boolean;
  direction: StudioWebhookDirection;
  payload: JsonObject;
  created_at: ColumnType<Date, Date | null, never>;
};

export type StudioWebhook = Selectable<StudioWebhookTable>;
export type NewStudioWebhook = Insertable<StudioWebhookTable>;

export type StudioNodeTable = Node & {
  category: string;
  sub_category: string | null;
  content: JsonObject & {
    __elwood_node_id: string;
    __elwood_node_name: string;
  };
};

export type StudioNode = Selectable<StudioNodeTable>;

/**
 * Public Schema
 */

export type PublicDatabase = Kysely<PublicTables>;
export type PublicQueryCreator = QueryCreator<PublicTables>;

export type PublicTables = {
  elwood_studio_content: StudioContentTable;
};

export type StudioContentTable = {
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

export type StudioContent = Selectable<StudioContentTable>;
