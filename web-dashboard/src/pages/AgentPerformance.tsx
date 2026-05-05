import { useEffect, useState, useCallback } from "react";
import { BarChart3, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import api from "../services/api";
import type { AgentPerformance as AgentPerfType, DeliveryMetrics } from "../types";

export default function AgentPerformance() {
  const [agents, setAgents] = useState<AgentPerfType[]>([]);
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentRes, metricsRes] = await Promise.all([
        api.get("/revenue/agent-performance"),
        api.get("/revenue/delivery-metrics?days=30"),
      ]);
      setAgents(agentRes.data);
      setMetrics(metricsRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-primary-700" />
        <h1 className="text-2xl font-bold">Performance & Delivery</h1>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" /> Delivery Rate
            </div>
            <div className="text-2xl font-bold text-green-600">{metrics.summary.deliveryRate}%</div>
            <div className="text-sm text-gray-500">{metrics.summary.delivered} / {metrics.summary.total}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" /> Read Rate
            </div>
            <div className="text-2xl font-bold text-blue-600">{metrics.summary.readRate}%</div>
            <div className="text-sm text-gray-500">{metrics.summary.read} read</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <AlertTriangle className="w-4 h-4" /> Failure Rate
            </div>
            <div className="text-2xl font-bold text-red-600">{metrics.summary.failureRate}%</div>
            <div className="text-sm text-gray-500">{metrics.summary.failed} failed</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" /> Total Messages
            </div>
            <div className="text-2xl font-bold">{metrics.summary.total.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">Agent Performance</h2>
        {agents.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalConversations" name="Total" fill="#6366f1" />
                <Bar dataKey="closedConversations" name="Closed" fill="#22c55e" />
                <Bar dataKey="slaBreaches" name="SLA Breaches" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>

            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="px-4 py-2 font-medium">Agent</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                  <th className="px-4 py-2 font-medium">Open</th>
                  <th className="px-4 py-2 font-medium">Closed</th>
                  <th className="px-4 py-2 font-medium">Avg Response</th>
                  <th className="px-4 py-2 font-medium">Avg Resolution</th>
                  <th className="px-4 py-2 font-medium">SLA Breaches</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.agentId} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2 capitalize text-gray-500">{a.role}</td>
                    <td className="px-4 py-2">{a.totalConversations}</td>
                    <td className="px-4 py-2">{a.openConversations}</td>
                    <td className="px-4 py-2">{a.closedConversations}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {a.avgFirstResponseMinutes !== null ? `${a.avgFirstResponseMinutes}m` : "-"}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {a.avgResolutionMinutes !== null ? `${a.avgResolutionMinutes}m` : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {a.slaBreaches > 0 ? (
                        <span className="text-red-600 font-medium">{a.slaBreaches}</span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="text-center text-gray-400 py-10">No agent data available</div>
        )}
      </div>
    </div>
  );
}
