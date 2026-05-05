import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { TenantRequest } from "../middleware/tenancy";
import * as revenueService from "../services/revenueService";

export async function getRevenueDashboard(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await revenueService.getRevenueDashboard();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTenantRevenue(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await revenueService.getTenantRevenue(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAgentPerformance(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await revenueService.getAgentPerformance(req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDeliveryMetrics(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const result = await revenueService.getDeliveryMetrics(req.tenantId!, days);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
