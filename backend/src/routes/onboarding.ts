import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenancy";
import * as onboardingController from "../controllers/onboardingController";

const router = Router();

router.use(authenticate, authorize("tenant_admin", "super_admin"), tenantGuard);

router.get("/status", onboardingController.getOnboardingStatus);
router.post("/select-plan", onboardingController.selectPlan);
router.post("/connect-meta", onboardingController.connectMeta);
router.post("/verify-phone", onboardingController.verifyPhone);
router.post("/complete", onboardingController.complete);

export default router;
