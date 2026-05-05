import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppAccount extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  accessTokenEncrypted: boolean;
  tokenExpiresAt: Date | null;
  tokenRotatedAt: Date | null;
  tokenRotationCount: number;
  webhookVerified: boolean;
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  messagingLimit: string;
  status: "active" | "inactive" | "disconnected";
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppAccountSchema = new Schema<IWhatsAppAccount>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true },
    phoneNumberId: { type: String, required: true },
    wabaId: { type: String, required: true },
    accessToken: { type: String, required: true },
    accessTokenEncrypted: { type: Boolean, default: false },
    tokenExpiresAt: { type: Date, default: null },
    tokenRotatedAt: { type: Date, default: null },
    tokenRotationCount: { type: Number, default: 0 },
    webhookVerified: { type: Boolean, default: false },
    qualityRating: {
      type: String,
      enum: ["GREEN", "YELLOW", "RED", "UNKNOWN"],
      default: "UNKNOWN",
    },
    messagingLimit: { type: String, default: "TIER_1K" },
    status: {
      type: String,
      enum: ["active", "inactive", "disconnected"],
      default: "active",
    },
  },
  { timestamps: true }
);

whatsAppAccountSchema.index({ tenantId: 1, phoneNumberId: 1 }, { unique: true });

export const WhatsAppAccount = mongoose.model<IWhatsAppAccount>(
  "WhatsAppAccount",
  whatsAppAccountSchema
);
