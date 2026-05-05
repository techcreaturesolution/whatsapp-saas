export interface User {
  _id: string;
  email: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "manager" | "agent";
  tenantId: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  status: "active" | "suspended" | "cancelled" | "pending";
  messageQuota: number;
  messagesUsed: number;
  onboardingStep: string;
  billingEmail: string;
  industry: string;
  companySize: string;
}

export interface WhatsAppAccount {
  _id: string;
  tenantId: string;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  webhookVerified: boolean;
  status: "active" | "inactive" | "disconnected";
}

export interface Contact {
  _id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  tags: string[];
  source: "manual" | "excel" | "api";
  notes: string;
  createdAt: string;
}

export interface Campaign {
  _id: string;
  tenantId: string;
  waAccountId: WhatsAppAccount | string;
  name: string;
  templateName: string;
  templateLanguage: string;
  status: "draft" | "queued" | "in_progress" | "paused" | "completed" | "cancelled";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: {
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  createdAt: string;
}

export interface Message {
  _id: string;
  direction: "outbound" | "inbound";
  type: string;
  content: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
  contactId: Contact | string;
}

export interface Conversation {
  _id: string;
  contactId: Contact;
  waAccountId: WhatsAppAccount;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  assignedAgentId: User | null;
  status: "open" | "closed" | "pending" | "snoozed";
  priority: "low" | "normal" | "high" | "urgent";
  sla: {
    firstResponseAt: string | null;
    firstResponseTimeMs: number | null;
    resolvedAt: string | null;
    resolutionTimeMs: number | null;
    slaBreached: boolean;
  };
  tags: string[];
  notes: string;
}

export interface AutoReplyRule {
  _id: string;
  name: string;
  triggerType: "keyword" | "exact" | "time";
  triggerValue: string;
  responseType: "text" | "template";
  responseContent: string;
  templateName: string;
  isActive: boolean;
  priority: number;
}

export interface Subscription {
  _id: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  status: "active" | "past_due" | "cancelled" | "trialing";
  messageQuota: number;
  priceMonthly: number;
  currentPeriodEnd: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
  [key: string]: T[] | number;
}

export interface Workflow {
  _id: string;
  tenantId: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "draft";
  trigger: {
    type: string;
    config: Record<string, unknown>;
  };
  actions: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    conditions: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    nextActionId: string | null;
    trueBranchActionId: string | null;
    falseBranchActionId: string | null;
  }>;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export interface PaymentRecord {
  _id: string;
  tenantId: string | { _id: string; name: string; slug: string };
  amount: number;
  currency: string;
  status: "pending" | "captured" | "failed" | "refunded";
  plan: string;
  invoiceNumber: string;
  createdAt: string;
}

export interface RevenueDashboard {
  totalRevenue: number;
  mrr: number;
  arr: number;
  mrrGrowth: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  activeSubscriptions: number;
  activeTenants: number;
  totalTenants: number;
  revenueByPlan: Record<string, { count: number; revenue: number }>;
  monthlyRevenueHistory: Array<{ month: string; total: number; count: number }>;
  recentPayments: PaymentRecord[];
}

export interface AgentPerformance {
  agentId: string;
  name: string;
  email: string;
  role: string;
  totalConversations: number;
  openConversations: number;
  closedConversations: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  slaBreaches: number;
}

export interface DeliveryMetrics {
  dailyMetrics: Array<{ date: string; status: string; count: number }>;
  summary: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
    failureRate: number;
  };
}

export interface OnboardingStatus {
  currentStep: string;
  stepIndex: number;
  totalSteps: number;
  steps: Array<{
    name: string;
    completed: boolean;
    current: boolean;
  }>;
  isComplete: boolean;
}

export interface DashboardStats {
  tenant: {
    name: string;
    plan: string;
    messagesUsed: number;
    messageQuota: number;
  };
  campaigns: { total: number; active: number };
  contacts: { total: number };
  conversations: { total: number; unread: number };
  messages: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    queued: number;
  };
}
