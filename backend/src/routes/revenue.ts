import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenancy";
import * as revenueController from "../controllers/revenueController";

const router = Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("super_admin"),
  revenueController.getRevenueDashboard
);

router.get(
  "/tenant",
  authenticate,
  tenantGuard,
  revenueController.getTenantRevenue
);

router.get(
  "/agent-performance",
  authenticate,
  authorize("tenant_admin", "manager", "super_admin"),
  tenantGuard,
  revenueController.getAgentPerformance
);

router.get(
  "/delivery-metrics",
  authenticate,
  tenantGuard,
  revenueController.getDeliveryMetrics
);

export default router;
