'use client';

import { useRouter } from 'next/navigation';
import { useRegistration, TenantTier } from '../context/RegistrationContext';

const tiers: {
  id: TenantTier;
  name: string;
  description: string;
  features: string[];
  price: string;
  highlighted?: boolean;
}[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Best for trying out the platform',
    price: 'Free',
    features: [
      'Up to 5 users',
      'Basic itinerary features',
      'Community support',
      'Shared infrastructure',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'For growing teams',
    price: 'Contact us',
    highlighted: true,
    features: [
      'Up to 50 users',
      'All itinerary features',
      'Email support',
      'Limited white-labeling',
      'Better performance',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 'Custom',
    features: [
      'Unlimited users',
      'All features included',
      'Priority support',
      'Full white-labeling',
      'Dedicated infrastructure',
      'Custom integrations',
    ],
  },
];

export default function PlanPage() {
  const router = useRouter();
  const { state, setTier } = useRegistration();

  const handleSelectTier = (tier: TenantTier) => {
    setTier(tier);
    router.push('/register/organization');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              1
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
              Select Plan
            </span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center font-semibold">
              2
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Organization
            </span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center font-semibold">
              3
            </div>
            <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              Admin Account
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
        Choose your plan
      </h2>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-lg ${
              tier.highlighted
                ? 'ring-2 ring-blue-600 dark:ring-blue-500'
                : 'border border-gray-200 dark:border-gray-700'
            } ${
              state.tier === tier.id ? 'ring-2 ring-green-500' : ''
            }`}
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {tier.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {tier.description}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                {tier.price}
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {tier.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center text-gray-600 dark:text-gray-300"
                >
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectTier(tier.id)}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                tier.highlighted
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
              }`}
            >
              Select {tier.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
