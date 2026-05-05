import mongoose, { Schema, Document } from "mongoose";

export type PaymentStatus = "pending" | "captured" | "failed" | "refunded";

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  plan: "free" | "starter" | "pro" | "enterprise";
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  invoiceNumber: string;
  failureReason: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["pending", "captured", "failed", "refunded"],
      default: "pending",
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      required: true,
    },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    invoiceNumber: { type: String, default: "" },
    failureReason: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

paymentSchema.index({ tenantId: 1, createdAt: -1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

export const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
