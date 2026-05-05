import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { Tenant } from "../models/Tenant";
import { User } from "../models/User";
import { Subscription, PLAN_CONFIG } from "../models/Subscription";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { Contact } from "../models/Contact";
import { Campaign } from "../models/Campaign";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { Workflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { Payment } from "../models/Payment";
import { AppError } from "../middleware/errorHandler";

export async function listTenants(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.plan) filter.plan = req.query.plan;
    if (req.query.search) {
      const escaped = (req.query.search as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Tenant.countDocuments(filter),
    ]);

    res.json({ tenants, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

export async function getTenantById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) throw new AppError("Tenant not found", 404);

    const [users, subscription, accountCount, contactCount, campaignCount, messageCount] = await Promise.all([
      User.find({ tenantId: tenant._id }).select("-password -otp -otpExpiresAt"),
      Subscription.findOne({ tenantId: tenant._id }),
      WhatsAppAccount.countDocuments({ tenantId: tenant._id }),
      Contact.countDocuments({ tenantId: tenant._id }),
      Campaign.countDocuments({ tenantId: tenant._id }),
      Message.countDocuments({ tenantId: tenant._id }),
    ]);

    res.json({
      tenant,
      users,
      subscription,
      stats: { accounts: accountCount, contacts: contactCount, campaigns: campaignCount, messages: messageCount },
    });
  } catch (error) {
    next(error);
  }
}

export async function suspendTenant(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: "suspended" },
      { new: true }
    );
    if (!tenant) throw new AppError("Tenant not found", 404);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}

export async function activateTenant(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    );
    if (!tenant) throw new AppError("Tenant not found", 404);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}

export async function updateTenantPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { plan } = req.body;
    if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
      throw new AppError("Invalid plan", 400);
    }

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { plan, messageQuota: planConfig.messageQuota },
      { new: true }
    );
    if (!tenant) throw new AppError("Tenant not found", 404);

    await Subscription.findOneAndUpdate(
      { tenantId: tenant._id },
      {
        plan,
        messageQuota: planConfig.messageQuota,
        priceMonthly: planConfig.priceMonthly,
        status: "active",
      }
    );

    res.json(tenant);
  } catch (error) {
    next(error);
  }
}

export async function deleteTenant(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) throw new AppError("Tenant not found", 404);

    await Promise.all([
      User.deleteMany({ tenantId: tenant._id }),
      WhatsAppAccount.deleteMany({ tenantId: tenant._id }),
      Contact.deleteMany({ tenantId: tenant._id }),
      Campaign.deleteMany({ tenantId: tenant._id }),
      Message.deleteMany({ tenantId: tenant._id }),
      Conversation.deleteMany({ tenantId: tenant._id }),
      Workflow.deleteMany({ tenantId: tenant._id }),
      WorkflowLog.deleteMany({ tenantId: tenant._id }),
      Subscription.deleteMany({ tenantId: tenant._id }),
      Payment.deleteMany({ tenantId: tenant._id }),
    ]);

    res.json({ message: "Tenant and all associated data deleted" });
  } catch (error) {
    next(error);
  }
}

export async function resetTenantUsage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { messagesUsed: 0 },
      { new: true }
    );
    if (!tenant) throw new AppError("Tenant not found", 404);
    res.json(tenant);
  } catch (error) {
    next(error);
  }
}
