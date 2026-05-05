import { z } from "zod";

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "regex", "exists"]),
  value: z.string().default(""),
});

const actionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["send_message", "send_template", "assign_agent", "add_tag", "remove_tag", "call_api", "update_contact", "create_task", "delay", "condition"]),
  config: z.record(z.unknown()).default({}),
  conditions: z.array(conditionSchema).default([]),
  nextActionId: z.string().nullable().default(null),
  trueBranchActionId: z.string().nullable().default(null),
  falseBranchActionId: z.string().nullable().default(null),
});

const triggerSchema = z.object({
  type: z.enum(["incoming_message", "keyword", "new_contact", "payment_received", "campaign_completed", "conversation_opened", "scheduled"]),
  config: z.record(z.unknown()).default({}),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema,
  actions: z.array(actionSchema).min(1, "At least one action is required"),
  waAccountId: z.string().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  actions: z.array(actionSchema).optional(),
  waAccountId: z.string().nullable().optional(),
});
