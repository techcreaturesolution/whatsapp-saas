import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import type { User } from "../types";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Admin",
  manager: "Manager",
  agent: "Agent",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  tenant_admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  agent: "bg-green-100 text-green-700",
};

export default function TeamManagement() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "agent" as "agent" | "manager" });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/team-members");
      setMembers(res.data.members);
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAdd = async () => {
    try {
      await api.post("/auth/team-members", form);
      toast.success("Team member added");
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "agent" });
      fetchMembers();
    } catch {
      toast.error("Failed to add team member");
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await api.delete(`/auth/team-members/${id}`);
      toast.success("Team member removed");
      fetchMembers();
    } catch {
      toast.error("Failed to remove");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-700" />
          <h1 className="text-2xl font-bold">Team Management</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Team Member</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as "agent" | "manager" })} className="w-full border rounded-lg px-3 py-2">
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">Add</button>
            <button onClick={() => setShowAdd(false)} className="border px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  {m.name}
                </td>
                <td className="px-4 py-3 text-gray-500">{m.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS[m.role] || "bg-gray-100"}`}>
                    {ROLE_LABELS[m.role] || m.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {m.role !== "tenant_admin" && m.role !== "super_admin" && (
                    <button onClick={() => handleRemove(m._id, m.name)} className="p-1.5 hover:bg-gray-100 rounded" title="Remove">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No team members yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
