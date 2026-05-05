import { useEffect, useState, useCallback } from "react";
import { GitBranch, Plus, Trash2, Play, Pause, Eye } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import type { Workflow } from "../types";

const TRIGGER_LABELS: Record<string, string> = {
  incoming_message: "Incoming Message",
  keyword: "Keyword Match",
  new_contact: "New Contact",
  payment_received: "Payment Received",
  campaign_completed: "Campaign Completed",
  conversation_opened: "Conversation Opened",
  scheduled: "Scheduled",
};

const ACTION_LABELS: Record<string, string> = {
  send_message: "Send Message",
  send_template: "Send Template",
  assign_agent: "Assign Agent",
  add_tag: "Add Tag",
  remove_tag: "Remove Tag",
  call_api: "Call External API",
  update_contact: "Update Contact",
  delay: "Delay",
  condition: "Condition",
};

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerType: "incoming_message",
    triggerConfig: "{}",
    actionType: "send_message",
    actionConfig: '{"message":"Hello!"}',
  });

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/workflows");
      setWorkflows(res.data.workflows);
    } catch {
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleCreate = async () => {
    try {
      let triggerConfig: Record<string, unknown> = {};
      let actionConfig: Record<string, unknown> = {};
      try { triggerConfig = JSON.parse(form.triggerConfig); } catch { /* empty */ }
      try { actionConfig = JSON.parse(form.actionConfig); } catch { /* empty */ }

      await api.post("/workflows", {
        name: form.name,
        description: form.description,
        trigger: { type: form.triggerType, config: triggerConfig },
        actions: [{
          id: "action-1",
          type: form.actionType,
          config: actionConfig,
          conditions: [],
          nextActionId: null,
          trueBranchActionId: null,
          falseBranchActionId: null,
        }],
      });
      toast.success("Workflow created");
      setShowCreate(false);
      setForm({ name: "", description: "", triggerType: "incoming_message", triggerConfig: "{}", actionType: "send_message", actionConfig: '{"message":"Hello!"}' });
      fetchWorkflows();
    } catch {
      toast.error("Failed to create workflow");
    }
  };

  const handleToggle = async (id: string, activate: boolean) => {
    try {
      await api.post(`/workflows/${id}/toggle`, { activate });
      toast.success(activate ? "Workflow activated" : "Workflow deactivated");
      fetchWorkflows();
    } catch {
      toast.error("Failed to toggle workflow");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    try {
      await api.delete(`/workflows/${id}`);
      toast.success("Workflow deleted");
      fetchWorkflows();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-primary-700" />
          <h1 className="text-2xl font-bold">Automation Workflows</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="My Workflow" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select value={form.triggerType} onChange={e => setForm({ ...form, triggerType: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Config (JSON)</label>
              <input value={form.triggerConfig} onChange={e => setForm({ ...form, triggerConfig: e.target.value })} className="w-full border rounded-lg px-3 py-2 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select value={form.actionType} onChange={e => setForm({ ...form, actionType: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                {Object.entries(ACTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Config (JSON)</label>
              <input value={form.actionConfig} onChange={e => setForm({ ...form, actionConfig: e.target.value })} className="w-full border rounded-lg px-3 py-2 font-mono text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Create</button>
            <button onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {selectedWorkflow && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{selectedWorkflow.name}</h2>
            <button onClick={() => setSelectedWorkflow(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Trigger:</span> {TRIGGER_LABELS[selectedWorkflow.trigger.type] || selectedWorkflow.trigger.type}</div>
            <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${selectedWorkflow.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{selectedWorkflow.status}</span></div>
            <div><span className="text-gray-500">Executions:</span> {selectedWorkflow.executionCount}</div>
            <div><span className="text-gray-500">Last Run:</span> {selectedWorkflow.lastExecutedAt ? new Date(selectedWorkflow.lastExecutedAt).toLocaleString() : "Never"}</div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Actions ({selectedWorkflow.actions.length})</h3>
            <div className="space-y-2">
              {selectedWorkflow.actions.map((action, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded">{idx + 1}</span>
                    <span className="font-medium text-sm">{ACTION_LABELS[action.type] || action.type}</span>
                  </div>
                  <pre className="text-xs text-gray-500 mt-1">{JSON.stringify(action.config, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Trigger</th>
              <th className="px-4 py-3 font-medium">Actions</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Executions</th>
              <th className="px-4 py-3 font-medium w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No workflows yet. Create one to get started.</td></tr>
            )}
            {workflows.map(w => (
              <tr key={w._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{w.name}</td>
                <td className="px-4 py-3 text-gray-500">{TRIGGER_LABELS[w.trigger.type] || w.trigger.type}</td>
                <td className="px-4 py-3 text-gray-500">{w.actions.length}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${w.status === "active" ? "bg-green-100 text-green-700" : w.status === "draft" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                    {w.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{w.executionCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedWorkflow(w)} className="p-1.5 hover:bg-gray-100 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                    {w.status === "active" ? (
                      <button onClick={() => handleToggle(w._id, false)} className="p-1.5 hover:bg-gray-100 rounded" title="Deactivate"><Pause className="w-4 h-4 text-orange-500" /></button>
                    ) : (
                      <button onClick={() => handleToggle(w._id, true)} className="p-1.5 hover:bg-gray-100 rounded" title="Activate"><Play className="w-4 h-4 text-green-500" /></button>
                    )}
                    <button onClick={() => handleDelete(w._id)} className="p-1.5 hover:bg-gray-100 rounded" title="Delete"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
