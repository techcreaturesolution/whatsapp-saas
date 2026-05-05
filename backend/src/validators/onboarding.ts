import { z } from "zod";

export const selectPlanSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "enterprise"]),
});

export const connectMetaSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  appSecret: z.string().min(1, "App Secret is required"),
  systemUserToken: z.string().min(1, "System User Token is required"),
  webhookVerifyToken: z.string().min(1, "Webhook Verify Token is required"),
});

export const verifyPhoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  wabaId: z.string().min(1, "WABA ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
});
