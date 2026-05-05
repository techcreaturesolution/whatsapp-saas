import { useEffect, useState, useCallback } from "react";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import toast from "react-hot-toast";
import api from "../services/api";
import type { RevenueDashboard as RevenueDashboardType } from "../types";

const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8",
  starter: "#60a5fa",
  pro: "#a78bfa",
  enterprise: "#f59e0b",
};

export default function RevenueDashboard() {
  const [data, setData] = useState<RevenueDashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/revenue/dashboard");
      setData(res.data);
    } catch {
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  const pieData = Object.entries(data.revenueByPlan).map(([plan, info]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: info.revenue,
    count: info.count,
  }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-6 h-6 text-primary-700" />
        <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" /> MRR
          </div>
          <div className="text-2xl font-bold">&#8377;{data.mrr.toLocaleString()}</div>
          <div className={`text-sm ${data.mrrGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
            {data.mrrGrowth >= 0 ? "+" : ""}{data.mrrGrowth}% vs last month
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp className="w-4 h-4" /> ARR
          </div>
          <div className="text-2xl font-bold">&#8377;{data.arr.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <CreditCard className="w-4 h-4" /> Total Revenue
          </div>
          <div className="text-2xl font-bold">&#8377;{data.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users className="w-4 h-4" /> Paid Subscriptions
          </div>
          <div className="text-2xl font-bold">{data.activeSubscriptions}</div>
          <div className="text-sm text-gray-500">{data.activeTenants} / {data.totalTenants} active</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyRevenueHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Revenue by Plan</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ₹${value}`}>
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={PLAN_COLORS[entry.name.toLowerCase()] || "#6366f1"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">No revenue data yet</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">Recent Payments</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-4 py-2 font-medium">Invoice</th>
              <th className="px-4 py-2 font-medium">Tenant</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentPayments.map(p => {
              const tenantName = typeof p.tenantId === "object" ? p.tenantId.name : p.tenantId;
              return (
                <tr key={p._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{p.invoiceNumber}</td>
                  <td className="px-4 py-2">{tenantName}</td>
                  <td className="px-4 py-2 capitalize">{p.plan}</td>
                  <td className="px-4 py-2">&#8377;{p.amount}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "captured" ? "bg-green-100 text-green-700" : p.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {data.recentPayments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No payments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
