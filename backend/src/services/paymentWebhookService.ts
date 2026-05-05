import crypto from "crypto";
import { env } from "../config/env";
import { Subscription, PLAN_CONFIG } from "../models/Subscription";
import { Tenant } from "../models/Tenant";
import { Payment } from "../models/Payment";
import { generateInvoiceNumber } from "../utils/crypto";
import { logger } from "../config/logger";
import type { TenantPlan } from "../models/Tenant";

export function verifyRazorpayWebhook(body: string, signature: string): boolean {
  if (!env.razorpayWebhookSecret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        notes?: Record<string, string>;
        error_description?: string;
      };
    };
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        notes?: Record<string, string>;
      };
    };
  };
}

export async function handlePaymentCaptured(payload: RazorpayWebhookPayload) {
  const payment = payload.payload.payment?.entity;
  if (!payment) return;

  const tenantId = payment.notes?.tenantId;
  const plan = payment.notes?.plan as TenantPlan | undefined;

  if (!tenantId || !plan) {
    logger.warn("Payment captured without tenantId or plan in notes");
    return;
  }

  const planConfig = PLAN_CONFIG[plan];
  if (!planConfig) {
    logger.warn(`Invalid plan: ${plan}`);
    return;
  }

  const subscription = await Subscription.findOneAndUpdate(
    { tenantId },
    {
      plan,
      status: "active",
      messageQuota: planConfig.messageQuota,
      priceMonthly: planConfig.priceMonthly,
      razorpaySubscriptionId: payment.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    { new: true }
  );

  if (!subscription) {
    logger.error(`No subscription found for tenant: ${tenantId}`);
    return;
  }

  await Tenant.findByIdAndUpdate(tenantId, {
    plan,
    messageQuota: planConfig.messageQuota,
    status: "active",
    onboardingStep: "payment_done",
  });

  await Payment.create({
    tenantId,
    subscriptionId: subscription._id,
    razorpayOrderId: payment.order_id,
    razorpayPaymentId: payment.id,
    amount: payment.amount / 100,
    currency: payment.currency,
    status: "captured",
    plan,
    billingPeriodStart: new Date(),
    billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    invoiceNumber: generateInvoiceNumber(tenantId),
  });

  logger.info(`Payment captured for tenant ${tenantId}, plan: ${plan}`);
}

export async function handlePaymentFailed(payload: RazorpayWebhookPayload) {
  const payment = payload.payload.payment?.entity;
  if (!payment) return;

  const tenantId = payment.notes?.tenantId;
  const plan = payment.notes?.plan as TenantPlan | undefined;

  if (!tenantId) {
    logger.warn("Payment failed without tenantId in notes");
    return;
  }

  const subscription = await Subscription.findOne({ tenantId });
  if (!subscription) return;

  await Payment.create({
    tenantId,
    subscriptionId: subscription._id,
    razorpayOrderId: payment.order_id,
    razorpayPaymentId: payment.id,
    amount: payment.amount / 100,
    currency: payment.currency,
    status: "failed",
    plan: plan || subscription.plan,
    billingPeriodStart: new Date(),
    billingPeriodEnd: new Date(),
    failureReason: payment.error_description || "Payment failed",
    invoiceNumber: generateInvoiceNumber(tenantId),
  });

  subscription.status = "past_due";
  await subscription.save();

  logger.warn(`Payment failed for tenant ${tenantId}`);
}

export async function handleSubscriptionExpired(tenantId: string) {
  const subscription = await Subscription.findOne({ tenantId });
  if (!subscription) return;

  subscription.status = "cancelled";
  subscription.cancelledAt = new Date();
  await subscription.save();

  await Tenant.findByIdAndUpdate(tenantId, { status: "suspended" });

  logger.warn(`Subscription expired, tenant ${tenantId} suspended`);
}

export async function handleSubscriptionRenewed(payload: RazorpayWebhookPayload) {
  const sub = payload.payload.subscription?.entity;
  if (!sub) return;

  const tenantId = sub.notes?.tenantId;
  if (!tenantId) return;

  const subscription = await Subscription.findOne({ tenantId });
  if (!subscription) return;

  subscription.status = "active";
  subscription.currentPeriodStart = new Date();
  subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await subscription.save();

  await Tenant.findByIdAndUpdate(tenantId, { status: "active" });

  logger.info(`Subscription renewed for tenant ${tenantId}`);
}

export async function processRazorpayWebhook(event: string, payload: RazorpayWebhookPayload) {
  switch (event) {
    case "payment.captured":
      await handlePaymentCaptured(payload);
      break;
    case "payment.failed":
      await handlePaymentFailed(payload);
      break;
    case "subscription.charged":
      await handleSubscriptionRenewed(payload);
      break;
    case "subscription.cancelled":
    case "subscription.expired": {
      const tenantId = payload.payload.subscription?.entity.notes?.tenantId;
      if (tenantId) await handleSubscriptionExpired(tenantId);
      break;
    }
    default:
      logger.debug(`Unhandled Razorpay event: ${event}`);
  }
}
