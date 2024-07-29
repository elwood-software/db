export enum TableName {
  Member = "member",
  Node = "node",
  NodeCategory = "node_category",
  Run = "run",
  RunEvent = "run_event",
  RunWorkflow = "run_workflow",
  Setting = "setting",
  StudioCustomer = "studio_customer",
  StudioSubscription = "studio_subscription",
  StudioPlan = "studio_plan",
  StudioNodePlan = "studio_node_plan",
  StudioWebhook = "studio_webhook",
}

export enum ViewName {
  Member = "elwood_member",
  Run = "elwood_run",
  RunEvent = "elwood_run_event",
  RunWorkflow = "elwood_run_workflow",
  RunTriggers = "elwood_run_triggers",
  StudioProfile = "elwood_run_profile",
  StudioSubscription = "elwood_studio_subscription",
  StudioPlan = "elwood_studio_plan",
  StudioNode = "studio_node",
  StudioContent = "elwood_studio_content",
}

export enum TypeName {
  NodeType = "node_type",
  NodeStatus = "node_status",
  StudioSubscriptionStatus = "studio_subscription_status",
  StudioFeedItem = "elwood_studio_feed_item",
  StudioPlanStatus = "elwood_studio_plan_status",
  StudioPlanType = "elwood_studio_plan_type",
  StudioWebhookDirection = "elwood_studio_webhook_direction",
}

export enum NodeTypes {
  Repository = "REPOSITORY",
  Tree = "TREE",
  Blob = "BLOB",
  Symlink = "SYMLINK",
}

export type NodeType = "REPOSITORY" | "TREE" | "BLOB" | "SYMLINK";

export enum NodeStatuses {
  Inactive = "INACTIVE",
  Active = "ACTIVE",
  Deleted = "DELETED",
  Archived = "ARCHIVED",
  Draft = "DRAFT",
  Unlisted = "UNLISTED",
}

export type NodeStatus =
  | "INACTIVE"
  | "ACTIVE"
  | "DELETED"
  | "ARCHIVED"
  | "DRAFT"
  | "UNLISTED";

export enum StudioPlanStatuses {
  Active = "ACTIVE",
  Expired = "EXPIRED",
  Unlisted = "UNLISTED",
  Migrated = "MIGRATED",
}

export type StudioPlanStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "UNLISTED"
  | "MIGRATED";

export enum StudioSubscriptionStatuses {
  Pending = "PENDING",
  Active = "ACTIVE",
  Canceled = "CANCELED",
  Expired = "EXPIRED",
  Hold = "HOLD",
}

export type StudioSubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "CANCELED"
  | "EXPIRED"
  | "HOLD";

export enum StudioWebhookDirections {
  Inbound = "INBOUND",
  Outbound = "OUTBOUND",
}

export type StudioWebhookDirection = "INBOUND" | "OUTBOUND";
