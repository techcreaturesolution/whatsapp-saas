import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Circle, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";
import type { OnboardingStatus } from "../types";

const STEP_INFO: Record<string, { title: string; description: string }> = {
  registered: { title: "Registration", description: "Account has been created" },
  plan_selected: { title: "Select Plan", description: "Choose a subscription plan" },
  payment_done: { title: "Payment", description: "Complete payment for selected plan" },
  meta_connected: { title: "Connect Meta", description: "Connect your Meta Business account" },
  phone_verified: { title: "Verify Phone", description: "Add and verify your WhatsApp number" },
  completed: { title: "Complete", description: "Setup is complete" },
};

const PLANS = [
  { id: "free", name: "Free", price: 0, messages: 100, features: ["100 messages/month", "1 WhatsApp number", "Basic analytics"] },
  { id: "starter", name: "Starter", price: 999, messages: 5000, features: ["5,000 messages/month", "2 WhatsApp numbers", "Auto-reply rules", "Campaign tools"] },
  { id: "pro", name: "Pro", price: 2999, messages: 25000, features: ["25,000 messages/month", "5 WhatsApp numbers", "Workflow automation", "Priority support"] },
  { id: "enterprise", name: "Enterprise", price: 9999, messages: 100000, features: ["100,000 messages/month", "Unlimited numbers", "Custom integrations", "Dedicated support"] },
];

export default function Onboarding() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [metaForm, setMetaForm] = useState({ appId: "", appSecret: "", systemUserToken: "", webhookVerifyToken: "" });
  const [phoneForm, setPhoneForm] = useState({ name: "", phoneNumber: "", phoneNumberId: "", wabaId: "", accessToken: "" });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get("/onboarding/status");
      setStatus(res.data);
    } catch {
      toast.error("Failed to load onboarding status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSelectPlan = async (plan: string) => {
    setSaving(true);
    try {
      await api.post("/onboarding/select-plan", { plan });
      toast.success("Plan selected");
      fetchStatus();
    } catch {
      toast.error("Failed to select plan");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectMeta = async () => {
    setSaving(true);
    try {
      await api.post("/onboarding/connect-meta", metaForm);
      toast.success("Meta connected");
      fetchStatus();
    } catch {
      toast.error("Failed to connect Meta");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPhone = async () => {
    setSaving(true);
    try {
      await api.post("/onboarding/verify-phone", phoneForm);
      toast.success("Phone verified");
      fetchStatus();
    } catch {
      toast.error("Failed to verify phone");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await api.post("/onboarding/complete");
      toast.success("Onboarding complete!");
      fetchStatus();
    } catch {
      toast.error("Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !status) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  }

  if (status.isComplete) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Setup Complete!</h1>
        <p className="text-gray-500 mb-6">Your WhatsApp Business account is ready to use.</p>
        <a href="/" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 inline-block">Go to Dashboard</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Setup Your Account</h1>

      <div className="flex items-center gap-2 mb-8">
        {status.steps.map((step, idx) => (
          <div key={step.name} className="flex items-center gap-2">
            {idx > 0 && <ArrowRight className="w-4 h-4 text-gray-300" />}
            <div className={`flex items-center gap-1 text-sm ${step.completed ? "text-green-600" : step.current ? "text-primary-600 font-semibold" : "text-gray-400"}`}>
              {step.completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              <span className="hidden sm:inline">{STEP_INFO[step.name]?.title || step.name}</span>
            </div>
          </div>
        ))}
      </div>

      {status.currentStep === "registered" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Choose Your Plan</h2>
          <p className="text-gray-500 mb-4">Select a plan that fits your business needs.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.map(plan => (
              <div key={plan.id} className="border rounded-xl p-4 hover:border-primary-500 cursor-pointer transition-colors" onClick={() => handleSelectPlan(plan.id)}>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="text-2xl font-bold text-primary-600 my-1">
                  {plan.price === 0 ? "Free" : `₹${plan.price}/mo`}
                </div>
                <ul className="text-sm text-gray-500 space-y-1 mt-2">
                  {plan.features.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {status.currentStep === "plan_selected" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Complete Payment</h2>
          <p className="text-gray-500 mb-4">Payment integration with Razorpay. For now, plan has been selected.</p>
          <button onClick={() => handleSelectPlan("free")} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue with Free Plan"}
          </button>
        </div>
      )}

      {status.currentStep === "payment_done" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Connect Meta Business</h2>
          <p className="text-gray-500 mb-4">Enter your Meta App credentials to connect WhatsApp Cloud API.</p>
          <div className="space-y-3">
            <input placeholder="Meta App ID" value={metaForm.appId} onChange={e => setMetaForm({ ...metaForm, appId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="App Secret" type="password" value={metaForm.appSecret} onChange={e => setMetaForm({ ...metaForm, appSecret: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="System User Token" type="password" value={metaForm.systemUserToken} onChange={e => setMetaForm({ ...metaForm, systemUserToken: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="Webhook Verify Token" value={metaForm.webhookVerifyToken} onChange={e => setMetaForm({ ...metaForm, webhookVerifyToken: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <button onClick={handleConnectMeta} disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect Meta"}
            </button>
          </div>
        </div>
      )}

      {status.currentStep === "meta_connected" && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-2">Add & Verify Phone Number</h2>
          <p className="text-gray-500 mb-4">Enter your WhatsApp Business phone number details.</p>
          <div className="space-y-3">
            <input placeholder="Account Name" value={phoneForm.name} onChange={e => setPhoneForm({ ...phoneForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="Phone Number (e.g. +919876543210)" value={phoneForm.phoneNumber} onChange={e => setPhoneForm({ ...phoneForm, phoneNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="Phone Number ID" value={phoneForm.phoneNumberId} onChange={e => setPhoneForm({ ...phoneForm, phoneNumberId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="WABA ID" value={phoneForm.wabaId} onChange={e => setPhoneForm({ ...phoneForm, wabaId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <input placeholder="Access Token" type="password" value={phoneForm.accessToken} onChange={e => setPhoneForm({ ...phoneForm, accessToken: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            <button onClick={handleVerifyPhone} disabled={saving} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Phone"}
            </button>
          </div>
        </div>
      )}

      {status.currentStep === "phone_verified" && (
        <div className="bg-white rounded-xl border p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">All Steps Completed!</h2>
          <p className="text-gray-500 mb-4">Click below to finish setup and activate your account.</p>
          <button onClick={handleComplete} disabled={saving} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Setup"}
          </button>
        </div>
      )}
    </div>
  );
}
