import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { tenantGuard } from "../middleware/tenancy";
import * as chatController from "../controllers/chatController";

const router = Router();

router.use(authenticate, tenantGuard);

router.get("/conversations", chatController.getConversations);
router.get("/conversations/:id/messages", chatController.getMessages);
router.post("/conversations/:id/reply", chatController.sendReply);
router.post("/conversations/:id/read", chatController.markRead);
router.post("/conversations/:id/assign", chatController.assignAgent);
router.post("/conversations/:id/close", chatController.closeConversation);
router.put("/conversations/:id/priority", chatController.updatePriority);
router.post("/conversations/:id/transfer", chatController.transferConversation);

export default router;
