import { Request, Response } from "express";
import { verifyRazorpayWebhook, processRazorpayWebhook } from "../services/paymentWebhookService";
import { logger } from "../config/logger";

export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!signature) {
      logger.warn("Razorpay webhook missing signature header");
      res.sendStatus(400);
      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !verifyRazorpayWebhook(rawBody.toString(), signature)) {
      logger.warn("Razorpay webhook signature verification failed");
      res.sendStatus(400);
      return;
    }

    const { event, payload } = req.body;

    if (!event) {
      res.sendStatus(400);
      return;
    }

    await processRazorpayWebhook(event, { event, payload });

    res.sendStatus(200);
  } catch (error) {
    logger.error("Razorpay webhook error:", error);
    res.sendStatus(200);
  }
}
