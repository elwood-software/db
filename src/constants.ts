export enum TableName {
  Member = "member",
  Node = "node",
  NodeCategory = "node_category",
  Run = "run",
  RunEvent = "run_event",
  RunWorkflow = "run_workflow",
  Setting = "setting",
  StudioProfile = "studio_profile",
  StudioSubscription = "studio_subscription",
  StudioPlan = "studio_plan",
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
  StudioNode = "elwood_studio_node",
}

export enum TypeName {
  NodeType = "node_type",
  NodeStatus = "node_status",
  StudioSubscriptionStatus = "studio_subscription_status",
  StudioFeedItem = "elwood_studio_feed_item",
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
