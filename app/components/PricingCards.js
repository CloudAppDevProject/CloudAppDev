'use client';

export default function PricingCards({ onSelect }: { onSelect: (tier: string) => void }) {
  const plans = [
    {
      tier: 'FREE',
      name: 'Free',
      price: '$0',
      priceDetail: 'Forever free',
      features: [
        '5 team members',
        'Basic itinerary features',
        'Community support',
        'Public sharing',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      tier: 'STANDARD',
      name: 'Standard',
      price: '$49',
      priceDetail: 'per month',
      features: [
        '50 team members',
        'Advanced analytics',
        'API access',
        'Email support',
        'Priority features',
        'Custom branding',
      ],
      cta: 'Start 14-day trial',
      popular: true,
    },
    {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      price: 'Custom',
      priceDetail: 'Contact us',
      features: [
        'Unlimited team members',
        'All features included',
        'Custom domain',
        'Priority support',
        'SLA guarantee',
        'Dedicated account manager',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Start with a free plan and upgrade as you grow
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`relative rounded-lg border-2 p-8 ${
              plan.popular
                ? 'border-blue-500 shadow-xl scale-105'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.price !== 'Custom' && (
                  <span className="ml-2 text-gray-600 dark:text-gray-400">
                    {plan.priceDetail}
                  </span>
                )}
              </div>
              {plan.price === 'Custom' && (
                <p className="text-gray-600 dark:text-gray-400">{plan.priceDetail}</p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5"
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
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSelect(plan.tier)}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                plan.popular
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
