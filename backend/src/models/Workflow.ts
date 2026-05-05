import mongoose, { Schema, Document } from "mongoose";

export type WorkflowStatus = "active" | "inactive" | "draft";
export type TriggerType = "incoming_message" | "keyword" | "new_contact" | "payment_received" | "campaign_completed" | "conversation_opened" | "scheduled";
export type ActionType = "send_message" | "send_template" | "assign_agent" | "add_tag" | "remove_tag" | "call_api" | "update_contact" | "create_task" | "delay" | "condition";
export type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than" | "regex" | "exists";

export interface IWorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface IWorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
  conditions: IWorkflowCondition[];
  nextActionId: string | null;
  trueBranchActionId: string | null;
  falseBranchActionId: string | null;
}

export interface IWorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface IWorkflow extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: IWorkflowTrigger;
  actions: IWorkflowAction[];
  waAccountId: mongoose.Types.ObjectId | null;
  executionCount: number;
  lastExecutedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const workflowConditionSchema = new Schema<IWorkflowCondition>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "regex", "exists"],
      required: true,
    },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const workflowActionSchema = new Schema<IWorkflowAction>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ["send_message", "send_template", "assign_agent", "add_tag", "remove_tag", "call_api", "update_contact", "create_task", "delay", "condition"],
      required: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
    conditions: [workflowConditionSchema],
    nextActionId: { type: String, default: null },
    trueBranchActionId: { type: String, default: null },
    falseBranchActionId: { type: String, default: null },
  },
  { _id: false }
);

const workflowTriggerSchema = new Schema<IWorkflowTrigger>(
  {
    type: {
      type: String,
      enum: ["incoming_message", "keyword", "new_contact", "payment_received", "campaign_completed", "conversation_opened", "scheduled"],
      required: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const workflowSchema = new Schema<IWorkflow>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    trigger: { type: workflowTriggerSchema, required: true },
    actions: [workflowActionSchema],
    waAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", default: null },
    executionCount: { type: Number, default: 0 },
    lastExecutedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workflowSchema.index({ tenantId: 1, status: 1 });

export const Workflow = mongoose.model<IWorkflow>("Workflow", workflowSchema);
