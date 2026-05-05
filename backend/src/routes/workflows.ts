import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenancy";
import * as workflowController from "../controllers/workflowController";

const router = Router();

router.use(authenticate, authorize("tenant_admin", "manager", "super_admin"), tenantGuard);

router.post("/", workflowController.createWorkflow);
router.get("/", workflowController.getWorkflows);
router.get("/:id", workflowController.getWorkflowById);
router.put("/:id", workflowController.updateWorkflow);
router.delete("/:id", workflowController.deleteWorkflow);
router.post("/:id/toggle", workflowController.toggleWorkflow);
router.get("/:id/logs", workflowController.getWorkflowLogs);

export default router;
