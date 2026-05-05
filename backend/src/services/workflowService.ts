import { Workflow, IWorkflow } from "../models/Workflow";
import { WorkflowLog } from "../models/WorkflowLog";
import { Contact } from "../models/Contact";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { Conversation } from "../models/Conversation";
import { sendTextMessage, sendTemplateMessage } from "./whatsappApiService";
import { getDecryptedToken } from "../utils/crypto";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../config/logger";
import type { IWorkflowAction, TriggerType } from "../models/Workflow";
import type { WorkflowLogStatus } from "../models/WorkflowLog";

export async function createWorkflow(tenantId: string, data: {
  name: string;
  description?: string;
  trigger: { type: TriggerType; config: Record<string, unknown> };
  actions: IWorkflowAction[];
  waAccountId?: string;
}) {
  const workflow = new Workflow({
    tenantId,
    name: data.name,
    description: data.description || "",
    trigger: data.trigger,
    actions: data.actions,
    waAccountId: data.waAccountId || null,
    status: "draft",
  });

  await workflow.save();
  return workflow;
}

export async function getWorkflows(tenantId: string, query: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { tenantId };
  if (query.status) filter.status = query.status;

  const [workflows, total] = await Promise.all([
    Workflow.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Workflow.countDocuments(filter),
  ]);

  return { workflows, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getWorkflowById(tenantId: string, workflowId: string) {
  const workflow = await Workflow.findOne({ _id: workflowId, tenantId });
  if (!workflow) throw new AppError("Workflow not found", 404);
  return workflow;
}

export async function updateWorkflow(tenantId: string, workflowId: string, data: Record<string, unknown>) {
  const workflow = await Workflow.findOneAndUpdate(
    { _id: workflowId, tenantId },
    { $set: data },
    { new: true }
  );
  if (!workflow) throw new AppError("Workflow not found", 404);
  return workflow;
}

export async function deleteWorkflow(tenantId: string, workflowId: string) {
  const workflow = await Workflow.findOneAndDelete({ _id: workflowId, tenantId });
  if (!workflow) throw new AppError("Workflow not found", 404);
  return { message: "Workflow deleted" };
}

export async function toggleWorkflow(tenantId: string, workflowId: string, activate: boolean) {
  const workflow = await Workflow.findOneAndUpdate(
    { _id: workflowId, tenantId },
    { status: activate ? "active" : "inactive" },
    { new: true }
  );
  if (!workflow) throw new AppError("Workflow not found", 404);
  return workflow;
}

export async function getWorkflowLogs(tenantId: string, workflowId: string, query: {
  page?: number;
  limit?: number;
}) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    WorkflowLog.find({ workflowId, tenantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WorkflowLog.countDocuments({ workflowId, tenantId }),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}

export async function executeWorkflow(
  workflow: IWorkflow,
  triggerData: Record<string, unknown>,
  context: {
    contactId?: string;
    conversationId?: string;
    waAccountId?: string;
  }
) {
  const log = new WorkflowLog({
    tenantId: workflow.tenantId,
    workflowId: workflow._id,
    triggerData,
    status: "started",
    startedAt: new Date(),
    contactId: context.contactId || null,
    conversationId: context.conversationId || null,
  });

  try {
    const firstAction = workflow.actions[0];
    if (!firstAction) {
      log.status = "completed";
      log.completedAt = new Date();
      await log.save();
      return log;
    }

    await executeAction(workflow, firstAction, triggerData, context, log);

    log.status = "completed";
    log.completedAt = new Date();
    await log.save();

    await Workflow.findByIdAndUpdate(workflow._id, {
      $inc: { executionCount: 1 },
      lastExecutedAt: new Date(),
    });

    return log;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    log.status = "failed";
    log.error = errMessage;
    log.completedAt = new Date();
    await log.save();

    logger.error(`Workflow ${workflow._id} execution failed:`, error);
    return log;
  }
}

async function executeAction(
  workflow: IWorkflow,
  action: IWorkflowAction,
  triggerData: Record<string, unknown>,
  context: {
    contactId?: string;
    conversationId?: string;
    waAccountId?: string;
  },
  log: InstanceType<typeof WorkflowLog>
) {
  const actionLog: {
    actionId: string;
    actionType: string;
    status: WorkflowLogStatus;
    result: Record<string, unknown>;
    executedAt: Date;
    error: string;
  } = {
    actionId: action.id,
    actionType: action.type,
    status: "started",
    result: {},
    executedAt: new Date(),
    error: "",
  };

  try {
    if (action.conditions && action.conditions.length > 0) {
      const conditionsMet = evaluateConditions(action.conditions, triggerData, context);
      if (!conditionsMet) {
        actionLog.status = "skipped";
        log.actionsExecuted.push(actionLog);

        if (action.falseBranchActionId) {
          const nextAction = workflow.actions.find(a => a.id === action.falseBranchActionId);
          if (nextAction) {
            await executeAction(workflow, nextAction, triggerData, context, log);
          }
        }
        return;
      }
    }

    const result = await executeActionByType(action, triggerData, context, workflow.tenantId.toString());
    actionLog.status = "completed";
    actionLog.result = result;
    log.actionsExecuted.push(actionLog);

    const nextActionId = action.type === "condition"
      ? action.trueBranchActionId
      : action.nextActionId;

    if (nextActionId) {
      const nextAction = workflow.actions.find(a => a.id === nextActionId);
      if (nextAction) {
        await executeAction(workflow, nextAction, triggerData, context, log);
      }
    }
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    actionLog.status = "failed";
    actionLog.error = errMessage;
    log.actionsExecuted.push(actionLog);
    throw error;
  }
}

function evaluateConditions(
  conditions: IWorkflowAction["conditions"],
  triggerData: Record<string, unknown>,
  context: Record<string, unknown>
): boolean {
  const data = { ...triggerData, ...context };

  return conditions.every(condition => {
    const fieldValue = String(data[condition.field] ?? "");
    const condValue = condition.value;

    switch (condition.operator) {
      case "equals":
        return fieldValue === condValue;
      case "not_equals":
        return fieldValue !== condValue;
      case "contains":
        return fieldValue.toLowerCase().includes(condValue.toLowerCase());
      case "not_contains":
        return !fieldValue.toLowerCase().includes(condValue.toLowerCase());
      case "greater_than":
        return Number(fieldValue) > Number(condValue);
      case "less_than":
        return Number(fieldValue) < Number(condValue);
      case "regex":
        try {
          return new RegExp(condValue, "i").test(fieldValue);
        } catch {
          return false;
        }
      case "exists":
        return fieldValue !== "" && fieldValue !== "undefined";
      default:
        return false;
    }
  });
}

async function executeActionByType(
  action: IWorkflowAction,
  triggerData: Record<string, unknown>,
  context: { contactId?: string; conversationId?: string; waAccountId?: string },
  tenantId: string
): Promise<Record<string, unknown>> {
  const config = action.config;

  switch (action.type) {
    case "send_message": {
      const waAccountId = (config.waAccountId as string) || context.waAccountId;
      const contactPhone = (config.to as string) || (triggerData.contactPhone as string);
      if (!waAccountId || !contactPhone) return { skipped: true, reason: "Missing account or phone" };

      const account = await WhatsAppAccount.findById(waAccountId);
      if (!account) return { skipped: true, reason: "Account not found" };

      const text = config.message as string;
      const result = await sendTextMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken: getDecryptedToken(account),
        to: contactPhone,
        text,
      });
      return { success: result.success, waMessageId: result.waMessageId };
    }

    case "send_template": {
      const waAccountId = (config.waAccountId as string) || context.waAccountId;
      const contactPhone = (config.to as string) || (triggerData.contactPhone as string);
      if (!waAccountId || !contactPhone) return { skipped: true, reason: "Missing account or phone" };

      const account = await WhatsAppAccount.findById(waAccountId);
      if (!account) return { skipped: true, reason: "Account not found" };

      const result = await sendTemplateMessage({
        phoneNumberId: account.phoneNumberId,
        accessToken: getDecryptedToken(account),
        to: contactPhone,
        templateName: config.templateName as string,
        languageCode: (config.languageCode as string) || "en",
        bodyParams: config.bodyParams as string[] | undefined,
        headerParams: config.headerParams as string[] | undefined,
      });
      return { success: result.success, waMessageId: result.waMessageId };
    }

    case "assign_agent": {
      const conversationId = context.conversationId;
      const agentId = config.agentId as string;
      if (!conversationId || !agentId) return { skipped: true, reason: "Missing conversation or agent" };

      await Conversation.findByIdAndUpdate(conversationId, { assignedAgentId: agentId });
      return { assigned: true, agentId };
    }

    case "add_tag": {
      const contactId = context.contactId;
      const tag = config.tag as string;
      if (!contactId || !tag) return { skipped: true, reason: "Missing contact or tag" };

      await Contact.findByIdAndUpdate(contactId, { $addToSet: { tags: tag } });
      return { tagged: true, tag };
    }

    case "remove_tag": {
      const contactId = context.contactId;
      const tag = config.tag as string;
      if (!contactId || !tag) return { skipped: true, reason: "Missing contact or tag" };

      await Contact.findByIdAndUpdate(contactId, { $pull: { tags: tag } });
      return { untagged: true, tag };
    }

    case "update_contact": {
      const contactId = context.contactId;
      const updates = config.updates as Record<string, unknown>;
      if (!contactId || !updates) return { skipped: true, reason: "Missing contact or updates" };

      await Contact.findByIdAndUpdate(contactId, { $set: updates });
      return { updated: true, fields: Object.keys(updates) };
    }

    case "call_api": {
      const url = config.url as string;
      const method = (config.method as string) || "POST";
      const headers = (config.headers as Record<string, string>) || {};
      const body = config.body as Record<string, unknown> | undefined;

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          body: body ? JSON.stringify({ ...body, triggerData, tenantId }) : undefined,
        });

        const responseData = await response.text();
        return { statusCode: response.status, response: responseData.substring(0, 500) };
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : "Unknown error";
        return { error: errMessage };
      }
    }

    case "delay": {
      const delayMs = (config.delaySeconds as number || 0) * 1000;
      if (delayMs > 0 && delayMs <= 30000) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      return { delayed: true, delayMs };
    }

    case "condition": {
      return { evaluated: true };
    }

    default:
      return { skipped: true, reason: `Unknown action type: ${action.type}` };
  }
}

export async function findAndExecuteWorkflows(
  tenantId: string,
  triggerType: TriggerType,
  triggerData: Record<string, unknown>,
  context: {
    contactId?: string;
    conversationId?: string;
    waAccountId?: string;
  }
) {
  const workflows = await Workflow.find({
    tenantId,
    status: "active",
    "trigger.type": triggerType,
  });

  const results = [];
  for (const workflow of workflows) {
    const triggerConfig = workflow.trigger.config;

    if (triggerType === "keyword") {
      const keyword = (triggerConfig.keyword as string || "").toLowerCase();
      const incomingText = (triggerData.incomingText as string || "").toLowerCase();
      if (!incomingText.includes(keyword)) continue;
    }

    try {
      const log = await executeWorkflow(workflow, triggerData, context);
      results.push({ workflowId: workflow._id, status: log.status });
    } catch (error) {
      logger.error(`Failed to execute workflow ${workflow._id}:`, error);
      results.push({ workflowId: workflow._id, status: "failed" });
    }
  }

  return results;
}
