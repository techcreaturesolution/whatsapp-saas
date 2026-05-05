import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenancy";
import * as authController from "../controllers/authController";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify-otp", authController.verifyOtp);
router.get("/me", authenticate, authController.getMe);
router.post(
  "/agents",
  authenticate,
  authorize("tenant_admin"),
  tenantGuard,
  authController.addAgent
);

router.post(
  "/team-members",
  authenticate,
  authorize("tenant_admin", "super_admin"),
  tenantGuard,
  authController.addTeamMember
);
router.get(
  "/team-members",
  authenticate,
  authorize("tenant_admin", "manager", "super_admin"),
  tenantGuard,
  authController.getTeamMembers
);
router.delete(
  "/team-members/:id",
  authenticate,
  authorize("tenant_admin", "super_admin"),
  tenantGuard,
  authController.removeTeamMember
);

export default router;
