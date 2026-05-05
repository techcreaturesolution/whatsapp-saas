import mongoose, { Schema, Document } from "mongoose";

export type ConversationPriority = "low" | "normal" | "high" | "urgent";

export interface ISLAMetrics {
  firstResponseAt: Date | null;
  firstResponseTimeMs: number | null;
  lastAgentResponseAt: Date | null;
  resolvedAt: Date | null;
  resolutionTimeMs: number | null;
  slaBreached: boolean;
}

export interface IConversation extends Document {
  tenantId: mongoose.Types.ObjectId;
  waAccountId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  assignedAgentId: mongoose.Types.ObjectId | null;
  status: "open" | "closed" | "pending" | "snoozed";
  priority: ConversationPriority;
  sla: ISLAMetrics;
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const slaMetricsSchema = new Schema<ISLAMetrics>(
  {
    firstResponseAt: { type: Date, default: null },
    firstResponseTimeMs: { type: Number, default: null },
    lastAgentResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolutionTimeMs: { type: Number, default: null },
    slaBreached: { type: Boolean, default: false },
  },
  { _id: false }
);

const conversationSchema = new Schema<IConversation>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    waAccountId: { type: Schema.Types.ObjectId, ref: "WhatsAppAccount", required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, default: "" },
    unreadCount: { type: Number, default: 0 },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["open", "closed", "pending", "snoozed"], default: "open" },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    sla: { type: slaMetricsSchema, default: () => ({}) },
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

conversationSchema.index({ tenantId: 1, waAccountId: 1, contactId: 1 }, { unique: true });
conversationSchema.index({ tenantId: 1, lastMessageAt: -1 });
conversationSchema.index({ tenantId: 1, assignedAgentId: 1 });
conversationSchema.index({ tenantId: 1, priority: 1 });

export const Conversation = mongoose.model<IConversation>("Conversation", conversationSchema);
