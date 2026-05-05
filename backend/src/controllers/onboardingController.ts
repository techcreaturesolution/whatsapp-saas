import { Response, NextFunction } from "express";
import { TenantRequest } from "../middleware/tenancy";
import * as onboardingService from "../services/onboardingService";
import { selectPlanSchema, connectMetaSchema, verifyPhoneSchema } from "../validators/onboarding";

export async function getOnboardingStatus(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await onboardingService.getOnboardingStatus(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function selectPlan(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const data = selectPlanSchema.parse(req.body);
    const result = await onboardingService.selectPlan(req.tenantId!, data.plan);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function connectMeta(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const data = connectMetaSchema.parse(req.body);
    const result = await onboardingService.connectMeta(req.tenantId!, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyPhone(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const data = verifyPhoneSchema.parse(req.body);
    const result = await onboardingService.verifyPhoneNumber(req.tenantId!, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function complete(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await onboardingService.completeOnboarding(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
