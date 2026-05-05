import { Response, NextFunction } from "express";
import { TenantRequest } from "../middleware/tenancy";
import * as workflowService from "../services/workflowService";
import { createWorkflowSchema, updateWorkflowSchema } from "../validators/workflow";

export async function createWorkflow(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const data = createWorkflowSchema.parse(req.body);
    const workflow = await workflowService.createWorkflow(req.tenantId!, data);
    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
}

export async function getWorkflows(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await workflowService.getWorkflows(req.tenantId!, {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string | undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowById(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const workflow = await workflowService.getWorkflowById(req.tenantId!, req.params.id);
    res.json(workflow);
  } catch (error) {
    next(error);
  }
}

export async function updateWorkflow(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const data = updateWorkflowSchema.parse(req.body);
    const workflow = await workflowService.updateWorkflow(req.tenantId!, req.params.id, data);
    res.json(workflow);
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkflow(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await workflowService.deleteWorkflow(req.tenantId!, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function toggleWorkflow(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const { activate } = req.body;
    const workflow = await workflowService.toggleWorkflow(req.tenantId!, req.params.id, activate);
    res.json(workflow);
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowLogs(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const result = await workflowService.getWorkflowLogs(req.tenantId!, req.params.id, {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
