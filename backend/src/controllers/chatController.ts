import { Response, NextFunction } from "express";
import { TenantRequest } from "../middleware/tenancy";
import * as chatService from "../services/chatService";

export async function getConversations(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await chatService.getConversations(req.tenantId!, {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      waAccountId: req.query.waAccountId as string,
      status: req.query.status as string,
      unreadOnly: req.query.unreadOnly === "true",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await chatService.getConversationMessages(req.tenantId!, req.params.id, {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function sendReply(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    const message = await chatService.sendReply(req.tenantId!, req.params.id, text);
    res.json(message);
  } catch (error) {
    next(error);
  }
}

export async function markRead(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await chatService.markConversationRead(req.tenantId!, req.params.id);
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function assignAgent(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const { agentId } = req.body;
    if (!agentId) {
      res.status(400).json({ error: "Agent ID is required" });
      return;
    }
    const conversation = await chatService.assignAgent(req.tenantId!, req.params.id, agentId);
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function closeConversation(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const conversation = await chatService.closeConversation(req.tenantId!, req.params.id);
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function updatePriority(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const { priority } = req.body;
    const validPriorities = ["low", "normal", "high", "urgent"];
    if (!priority || !validPriorities.includes(priority)) {
      res.status(400).json({ error: "Priority must be one of: low, normal, high, urgent" });
      return;
    }
    const conversation = await chatService.updateConversationPriority(req.tenantId!, req.params.id, priority);
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function transferConversation(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const { newAgentId, note } = req.body;
    if (!newAgentId) {
      res.status(400).json({ error: "New agent ID is required" });
      return;
    }
    const conversation = await chatService.transferConversation(req.tenantId!, req.params.id, newAgentId, note);
    res.json(conversation);
  } catch (error) {
    next(error);
  }
}
