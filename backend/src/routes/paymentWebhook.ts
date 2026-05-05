import { Router } from "express";
import { handleRazorpayWebhook } from "../controllers/paymentWebhookController";

const router = Router();

router.post("/razorpay", handleRazorpayWebhook);

export default router;
