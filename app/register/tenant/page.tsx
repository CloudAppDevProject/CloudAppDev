'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PricingCards from '@/app/components/PricingCards';

export default function TenantRegistration() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Step 1: Tenant Info
    companyName: '',
    tier: 'FREE',

    // Step 2: Owner Account
    ownerName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: '',
  });

  const handleTierSelect = (tier: string) => {
    setFormData({ ...formData, tier });
    setStep(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Firebase user (will be implemented with Firebase SDK)
      const authResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.ownerEmail,
          password: formData.password,
          firstName: formData.ownerName.split(' ')[0],
          lastName: formData.ownerName.split(' ').slice(1).join(' ') || '',
        }),
      });

      if (!authResponse.ok) {
        const authData = await authResponse.json();
        throw new Error(authData.error || 'Failed to create account');
      }

      const authData = await authResponse.json();

      // Step 2: Create tenant
      const tenantResponse = await fetch('/api/tenants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.companyName,
          tier: formData.tier,
          ownerEmail: formData.ownerEmail,
          ownerName: formData.ownerName,
          ownerFirebaseUid: authData.user?.id || authData.userId,
        }),
      });

      if (!tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        throw new Error(tenantData.error || 'Failed to create organization');
      }

      const { tenant } = await tenantResponse.json();

      // Redirect to tenant dashboard
      router.push(`/${tenant.slug}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-500' : 'text-gray-400'}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 1 ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'
                }`}
              >
                1
              </div>
              <span className="ml-2 font-semibold">Choose Plan</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300 mx-4" />
            <div className={`flex items-center ${step >= 2 ? 'text-blue-500' : 'text-gray-400'}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step >= 2 ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'
                }`}
              >
                2
              </div>
              <span className="ml-2 font-semibold">Create Account</span>
            </div>
          </div>
        </div>

        {/* Step 1: Pricing Selection */}
        {step === 1 && <PricingCards onSelect={handleTierSelect} />}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <button
              onClick={() => setStep(1)}
              className="mb-4 text-blue-500 hover:text-blue-600 flex items-center"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Change Plan
            </button>

            <h2 className="text-2xl font-bold mb-2">Create Your Organization</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Selected: <span className="font-semibold">{formData.tier}</span> plan
            </p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Your Name</label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  required
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleInputChange}
                  required
                  placeholder="john@acme.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                Already have an account?{' '}
                <a href="/login" className="text-blue-500 hover:text-blue-600">
                  Sign in
                </a>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
