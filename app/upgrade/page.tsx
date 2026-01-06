"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { UserContext } from "../context/UserContext";

export default function UpgradePage() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const [form, setForm] = useState({
    organizationName: "",
    tier: "standard"
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create new organization for user
      const res = await fetch(`/api/tenants/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationName: form.organizationName,
          tier: form.tier
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Upgrade failed" }));
        throw new Error(errData.message || "Upgrade failed");
      }

      const responseData = await res.json();
      console.log("[Upgrade] Organization created:", responseData.tenant);

      // Update token if new token was provided
      if (responseData.access_token) {
        localStorage.clear();
        localStorage.setItem('access_token', responseData.access_token);
        console.log("[Upgrade] Token updated with new organization");
      }

      // Force page reload to refresh user context
      window.location.href = "/";
    } catch (err: any) {
      console.error("[Upgrade] Error:", err);
      setError(err.message || "Upgrade failed");
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-sans">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please log in to upgrade your account.
        </div>
      </div>
    );
  }

  // Check if user is already in their own organization (not Free Community)
  if (user && (user as any).tenantId && (user as any).tenantId !== 1) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-sans">
        <h1 className="text-3xl font-bold mb-6">Manage Your Organization</h1>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          You already have your own organization!
        </div>
        <button
          onClick={() => router.push('/admin/tenant')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Go to Organization Settings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans text-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-white">Create Your Organization</h1>

      <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-3 text-white">Why upgrade?</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Create your own workspace with custom name</li>
          <li>Invite team members to collaborate</li>
          <li>Full control over your organization settings</li>
          <li>Choose the plan that fits your needs</li>
        </ul>
      </div>

      <form onSubmit={handleUpgrade} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">Organization Name</label>
          <input
            type="text"
            value={form.organizationName}
            onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
            className="w-full border border-gray-600 bg-gray-800 text-white rounded-lg p-3 focus:outline-none focus:border-blue-500"
            placeholder="Your Company Name"
            required
          />
          <p className="mt-1 text-sm text-gray-400">
            This will be your workspace name
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-200">Choose Your Plan</label>

          {/* Standard Tier */}
          <div
            className={`border-2 rounded-lg p-4 mb-4 cursor-pointer transition-all ${
              form.tier === 'standard'
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-600 bg-gray-800/50 hover:border-blue-400'
            }`}
            onClick={() => setForm({ ...form, tier: 'standard' })}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Standard</h3>
                <p className="text-gray-300">For growing teams</p>
                <ul className="text-sm text-gray-400 mt-2 space-y-1">
                  <li>• Separate space for your users</li>
                  <li>• Adjustable user size</li>
                  <li>• Pay by set users (up to 50)</li>
                  <li>• Priority support</li>
                </ul>
              </div>
              <div className="text-2xl font-bold text-white">$29<span className="text-sm text-gray-400">/mo</span></div>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div
            className={`border-2 rounded-lg p-4 mb-4 cursor-pointer transition-all ${
              form.tier === 'enterprise'
                ? 'border-blue-500 bg-blue-900/30'
                : 'border-gray-600 bg-gray-800/50 hover:border-blue-400'
            }`}
            onClick={() => setForm({ ...form, tier: 'enterprise' })}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Enterprise</h3>
                <p className="text-gray-300">For large organizations</p>
                <ul className="text-sm text-gray-400 mt-2 space-y-1">
                  <li>• Unlimited users</li>
                  <li>• Premium support</li>
                  <li>• Custom integrations</li>
                  <li>• Advanced security</li>
                </ul>
              </div>
              <div className="text-2xl font-bold text-white">$99<span className="text-sm text-gray-400">/mo</span></div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Creating Organization...' : 'Create Organization'}
        </button>
      </form>

      {error && (
        <div className="mt-6 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-400">
        <p>You can always change your plan later</p>
      </div>
    </div>
  );
}
