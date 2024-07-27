import type {
  ColumnType,
  Generated,
  Insertable,
  Kysely,
  QueryCreator as KQueryCreator,
  Selectable,
  Updateable,
} from "./deps.ts";
import type {
  NodeStatus,
  NodeType,
  StudioPlanStatus,
  StudioPlanType,
  StudioSubscriptionStatus,
  StudioWebhookDirection,
} from "./constants.ts";

// deno-lint-ignore no-explicit-any
export type JsonScalar = any;
export type JsonObject = Record<string, JsonScalar>;

/**
 * Elwood Schema
 */

export type ElwoodDatabase = Kysely<ElwoodDatabaseTables>;
export type ElwoodQueryCreator = KQueryCreator<ElwoodDatabaseTables>;

export type ElwoodDatabaseTables = {
  node: NodeTable;
  studio_plan: StudioPlanTable;
  studio_subscription: StudioSubscriptionTable;
  studio_customer: StudioCustomerTable;
  studio_node_plan: StudioNodePlanTable;
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
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date, Date>;
};

export type Node = Selectable<NodeTable>;
export type NewNode = Insertable<NodeTable>;
export type UpdateNode = Updateable<NodeTable>;

export type StudioPlanTable = {
  instance_id: string;
  id: Generated<string>;
  metadata: JsonObject;
  name: string;
  description: string;
  type: StudioPlanType;
  status: StudioPlanStatus;
  monthly_price: number;
  yearly_price: number;
  account_id: string;
  stripe_plan_id: string;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date, Date>;
};

export type StudioPlan = Selectable<StudioPlanTable>;
export type NewStudioPlan = Insertable<StudioPlanTable>;
export type UpdateStudioPlan = Updateable<StudioPlanTable>;

export type StudioSubscriptionTable = {
  instance_id: string;
  id: Generated<string>;
  account_id: string;
  plan_id: string;
  node_id: string;
  status: StudioSubscriptionStatus;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date, Date>;
};

export type StudioSubscription = Selectable<StudioSubscriptionTable>;
export type NewStudioSubscription = Insertable<StudioSubscriptionTable>;
export type UpdateStudioSubscription = Updateable<StudioSubscriptionTable>;

export type StudioCustomerTable = {
  instance_id: string;
  id: Generated<string>;
  user_id: string;
  metadata: JsonObject;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date, Date>;
};

export type StudioCustomer = Selectable<StudioCustomerTable>;
export type NewStudioCustomer = Insertable<StudioCustomerTable>;
export type UpdateStudioCustomer = Updateable<StudioCustomerTable>;

export type StudioNodePlanTable = {
  instance_id: string;
  id: Generated<string>;
  node_id: string;
  plan_id: string;
  created_at: ColumnType<Date, never, never>;
  updated_at: ColumnType<Date, Date, Date>;
};

export type StudioNodePlan = Selectable<StudioNodePlanTable>;
export type NewStudioNodePlan = Insertable<StudioNodePlanTable>;
export type UpdateStudioNodePlan = Updateable<StudioNodePlanTable>;

export type StudioWebhookTable = {
  instance_id: string;
  id: Generated<string>;
  reference_id: string;
  source: string;
  is_processed: boolean;
  direction: StudioWebhookDirection;
  payload: JsonObject;
  created_at: ColumnType<Date, never, never>;
};

export type StudioWebhook = Selectable<StudioWebhookTable>;
export type NewStudioWebhook = Insertable<StudioWebhookTable>;
export type UpdateStudioWebhook = Updateable<StudioWebhookTable>;

/**
 * Public Schema
 */

export type PublicDatabase = Kysely<PublicTables>;
export type PublicQueryCreator = KQueryCreator<PublicTables>;

export type PublicTables = {
  elwood_studio_node: StudioNodeTable;
};

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
