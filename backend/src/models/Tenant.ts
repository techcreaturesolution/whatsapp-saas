import mongoose, { Schema, Document } from "mongoose";

export type TenantPlan = "free" | "starter" | "pro" | "enterprise";
export type TenantStatus = "active" | "suspended" | "cancelled" | "pending";
export type OnboardingStep =
  | "registered"
  | "plan_selected"
  | "payment_done"
  | "meta_connected"
  | "phone_verified"
  | "completed";

export interface ITenant extends Document {
  name: string;
  slug: string;
  createdBy: mongoose.Types.ObjectId;
  plan: TenantPlan;
  status: TenantStatus;
  messageQuota: number;
  messagesUsed: number;
  onboardingStep: OnboardingStep;
  metaConfig: {
    appId: string;
    appSecret: string;
    systemUserToken: string;
    webhookVerifyToken: string;
  };
  billingEmail: string;
  billingAddress: string;
  industry: string;
  companySize: string;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "cancelled", "pending"],
      default: "pending",
    },
    messageQuota: { type: Number, default: 1000 },
    messagesUsed: { type: Number, default: 0 },
    onboardingStep: {
      type: String,
      enum: ["registered", "plan_selected", "payment_done", "meta_connected", "phone_verified", "completed"],
      default: "registered",
    },
    metaConfig: {
      appId: { type: String, default: "" },
      appSecret: { type: String, default: "" },
      systemUserToken: { type: String, default: "" },
      webhookVerifyToken: { type: String, default: "" },
    },
    billingEmail: { type: String, default: "" },
    billingAddress: { type: String, default: "" },
    industry: { type: String, default: "" },
    companySize: { type: String, default: "" },
  },
  { timestamps: true }
);

tenantSchema.index({ status: 1 });
tenantSchema.index({ plan: 1 });

export const Tenant = mongoose.model<ITenant>("Tenant", tenantSchema);
