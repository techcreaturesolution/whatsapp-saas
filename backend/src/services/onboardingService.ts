import { Tenant } from "../models/Tenant";
import { Subscription, PLAN_CONFIG } from "../models/Subscription";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { AppError } from "../middleware/errorHandler";
import { encrypt } from "../utils/crypto";
import { logger } from "../config/logger";
import type { TenantPlan, OnboardingStep } from "../models/Tenant";

const STEP_ORDER: OnboardingStep[] = [
  "registered",
  "plan_selected",
  "payment_done",
  "meta_connected",
  "phone_verified",
  "completed",
];

export async function getOnboardingStatus(tenantId: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError("Tenant not found", 404);

  const currentIdx = STEP_ORDER.indexOf(tenant.onboardingStep);
  return {
    currentStep: tenant.onboardingStep,
    stepIndex: currentIdx,
    totalSteps: STEP_ORDER.length,
    steps: STEP_ORDER.map((step, idx) => ({
      name: step,
      completed: idx < currentIdx,
      current: idx === currentIdx,
    })),
    isComplete: tenant.onboardingStep === "completed",
  };
}

export async function selectPlan(tenantId: string, plan: TenantPlan) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError("Tenant not found", 404);

  const planConfig = PLAN_CONFIG[plan];
  tenant.plan = plan;
  tenant.messageQuota = planConfig.messageQuota;

  const currentIdx = STEP_ORDER.indexOf(tenant.onboardingStep);
  if (plan === "free") {
    if (currentIdx < STEP_ORDER.indexOf("payment_done")) {
      tenant.onboardingStep = "payment_done";
    }
  } else {
    if (currentIdx < STEP_ORDER.indexOf("plan_selected")) {
      tenant.onboardingStep = "plan_selected";
    }
  }

  await tenant.save();

  let subscription = await Subscription.findOne({ tenantId });
  if (!subscription) {
    subscription = new Subscription({
      tenantId,
      plan,
      messageQuota: planConfig.messageQuota,
      priceMonthly: planConfig.priceMonthly,
      status: plan === "free" ? "active" : "trialing",
    });
    await subscription.save();
  } else {
    subscription.plan = plan;
    subscription.messageQuota = planConfig.messageQuota;
    subscription.priceMonthly = planConfig.priceMonthly;
    await subscription.save();
  }

  return { tenant, subscription };
}

export async function connectMeta(tenantId: string, data: {
  appId: string;
  appSecret: string;
  systemUserToken: string;
  webhookVerifyToken: string;
}) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError("Tenant not found", 404);

  const currentIdx = STEP_ORDER.indexOf(tenant.onboardingStep);
  if (currentIdx < STEP_ORDER.indexOf("payment_done")) {
    throw new AppError("Complete payment before connecting Meta", 400);
  }

  tenant.metaConfig = {
    appId: data.appId,
    appSecret: encrypt(data.appSecret),
    systemUserToken: encrypt(data.systemUserToken),
    webhookVerifyToken: data.webhookVerifyToken,
  };
  if (currentIdx < STEP_ORDER.indexOf("meta_connected")) {
    tenant.onboardingStep = "meta_connected";
  }
  await tenant.save();

  return tenant;
}

export async function verifyPhoneNumber(tenantId: string, data: {
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
}) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError("Tenant not found", 404);

  const currentIdx = STEP_ORDER.indexOf(tenant.onboardingStep);
  if (currentIdx < STEP_ORDER.indexOf("meta_connected")) {
    throw new AppError("Connect Meta before verifying phone number", 400);
  }

  const account = new WhatsAppAccount({
    tenantId,
    name: data.name,
    phoneNumber: data.phoneNumber,
    phoneNumberId: data.phoneNumberId,
    wabaId: data.wabaId,
    accessToken: encrypt(data.accessToken),
    accessTokenEncrypted: true,
    status: "active",
  });

  await account.save();

  if (currentIdx < STEP_ORDER.indexOf("phone_verified")) {
    tenant.onboardingStep = "phone_verified";
  }
  await tenant.save();

  return { tenant, account };
}

export async function completeOnboarding(tenantId: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new AppError("Tenant not found", 404);

  const currentIdx = STEP_ORDER.indexOf(tenant.onboardingStep);
  if (currentIdx < STEP_ORDER.indexOf("phone_verified")) {
    throw new AppError("Complete all prerequisite steps first", 400);
  }

  tenant.onboardingStep = "completed";
  tenant.status = "active";
  await tenant.save();

  logger.info(`Tenant ${tenantId} onboarding completed`);

  return tenant;
}
