import mongoose from "mongoose";
import { Payment } from "../models/Payment";
import { Subscription } from "../models/Subscription";
import { Tenant } from "../models/Tenant";
import { User } from "../models/User";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";

export async function getRevenueDashboard() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    activeSubscriptions,
    revenueByPlan,
    monthlyRevenueHistory,
    activeTenants,
    totalTenants,
    recentPayments,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { status: "captured" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Payment.aggregate([
      { $match: { status: "captured", createdAt: { $gte: thisMonthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Payment.aggregate([
      { $match: { status: "captured", createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    Subscription.countDocuments({ status: "active", plan: { $ne: "free" } }),

    Subscription.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
          revenue: { $sum: "$priceMonthly" },
        },
      },
    ]),

    Payment.aggregate([
      { $match: { status: "captured" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    Tenant.countDocuments({ status: "active" }),
    Tenant.countDocuments(),

    Payment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("tenantId", "name slug"),
  ]);

  const mrr = revenueByPlan.reduce((sum, p) => sum + p.revenue, 0);
  const arr = mrr * 12;

  const currentMRR = thisMonthRevenue[0]?.total || 0;
  const previousMRR = lastMonthRevenue[0]?.total || 0;
  const mrrGrowth = previousMRR > 0
    ? ((currentMRR - previousMRR) / previousMRR * 100)
    : 0;

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    mrr,
    arr,
    mrrGrowth: Math.round(mrrGrowth * 100) / 100,
    currentMonthRevenue: currentMRR,
    previousMonthRevenue: previousMRR,
    activeSubscriptions,
    activeTenants,
    totalTenants,
    revenueByPlan: revenueByPlan.reduce(
      (acc, item) => ({
        ...acc,
        [item._id]: { count: item.count, revenue: item.revenue },
      }),
      {} as Record<string, { count: number; revenue: number }>
    ),
    monthlyRevenueHistory: monthlyRevenueHistory.map(m => ({
      month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
      total: m.total,
      count: m.count,
    })),
    recentPayments,
  };
}

export async function getTenantRevenue(tenantId: string) {
  const [
    totalPaid,
    payments,
    subscription,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: "captured" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(20),
    Subscription.findOne({ tenantId }),
  ]);

  return {
    totalPaid: totalPaid[0]?.total || 0,
    currentPlan: subscription?.plan || "free",
    currentStatus: subscription?.status || "active",
    currentPeriodEnd: subscription?.currentPeriodEnd,
    payments,
  };
}

export async function getAgentPerformance(tenantId: string) {
  const tid = new mongoose.Types.ObjectId(tenantId);

  const agentStats = await Conversation.aggregate([
    { $match: { tenantId: tid, assignedAgentId: { $ne: null } } },
    {
      $group: {
        _id: "$assignedAgentId",
        totalConversations: { $sum: 1 },
        openConversations: {
          $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
        },
        closedConversations: {
          $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
        },
        avgFirstResponseMs: {
          $avg: "$sla.firstResponseTimeMs",
        },
        avgResolutionMs: {
          $avg: "$sla.resolutionTimeMs",
        },
        slaBreaches: {
          $sum: { $cond: [{ $eq: ["$sla.slaBreached", true] }, 1, 0] },
        },
      },
    },
  ]);

  const agentIds = agentStats.map(a => a._id);
  const agents = await User.find({ _id: { $in: agentIds } }).select("name email role");

  const agentMap = new Map(agents.map(a => [a._id.toString(), a]));

  return agentStats.map(stat => {
    const agent = agentMap.get(stat._id.toString());
    return {
      agentId: stat._id,
      name: agent?.name || "Unknown",
      email: agent?.email || "",
      role: agent?.role || "",
      totalConversations: stat.totalConversations,
      openConversations: stat.openConversations,
      closedConversations: stat.closedConversations,
      avgFirstResponseMinutes: stat.avgFirstResponseMs
        ? Math.round(stat.avgFirstResponseMs / 60000)
        : null,
      avgResolutionMinutes: stat.avgResolutionMs
        ? Math.round(stat.avgResolutionMs / 60000)
        : null,
      slaBreaches: stat.slaBreaches,
    };
  });
}

export async function getDeliveryMetrics(tenantId: string, days: number = 30) {
  const tid = new mongoose.Types.ObjectId(tenantId);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await Message.aggregate([
    { $match: { tenantId: tid, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  const deliveryRates = await Message.aggregate([
    { $match: { tenantId: tid, direction: "outbound", createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ["$status", ["sent", "delivered", "read"]] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "read"]] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
      },
    },
  ]);

  const rates = deliveryRates[0] || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 };

  return {
    dailyMetrics: metrics.map(m => ({
      date: m._id.date,
      status: m._id.status,
      count: m.count,
    })),
    summary: {
      total: rates.total,
      sent: rates.sent,
      delivered: rates.delivered,
      read: rates.read,
      failed: rates.failed,
      deliveryRate: rates.total > 0 ? Math.round((rates.delivered / rates.total) * 10000) / 100 : 0,
      readRate: rates.total > 0 ? Math.round((rates.read / rates.total) * 10000) / 100 : 0,
      failureRate: rates.total > 0 ? Math.round((rates.failed / rates.total) * 10000) / 100 : 0,
    },
  };
}
