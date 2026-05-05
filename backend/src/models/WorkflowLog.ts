import mongoose, { Schema, Document } from "mongoose";

export type WorkflowLogStatus = "started" | "completed" | "failed" | "skipped";

export interface IWorkflowLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  workflowId: mongoose.Types.ObjectId;
  triggerData: Record<string, unknown>;
  actionsExecuted: Array<{
    actionId: string;
    actionType: string;
    status: WorkflowLogStatus;
    result: Record<string, unknown>;
    executedAt: Date;
    error: string;
  }>;
  status: WorkflowLogStatus;
  startedAt: Date;
  completedAt: Date | null;
  error: string;
  contactId: mongoose.Types.ObjectId | null;
  conversationId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const workflowLogSchema = new Schema<IWorkflowLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
    triggerData: { type: Schema.Types.Mixed, default: {} },
    actionsExecuted: [
      {
        actionId: { type: String, required: true },
        actionType: { type: String, required: true },
        status: {
          type: String,
          enum: ["started", "completed", "failed", "skipped"],
          default: "started",
        },
        result: { type: Schema.Types.Mixed, default: {} },
        executedAt: { type: Date, default: Date.now },
        error: { type: String, default: "" },
      },
    ],
    status: {
      type: String,
      enum: ["started", "completed", "failed", "skipped"],
      default: "started",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    error: { type: String, default: "" },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },
  },
  { timestamps: true }
);

workflowLogSchema.index({ workflowId: 1, createdAt: -1 });
workflowLogSchema.index({ tenantId: 1, createdAt: -1 });

export const WorkflowLog = mongoose.model<IWorkflowLog>("WorkflowLog", workflowLogSchema);
