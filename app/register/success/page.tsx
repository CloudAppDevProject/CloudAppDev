'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context/RegistrationContext';

export default function SuccessPage() {
  const router = useRouter();
  const { state, reset } = useRegistration();

  // Redirect if registration wasn't completed
  useEffect(() => {
    if (!state.tier || !state.namespace || !state.adminEmail) {
      router.push('/register/plan');
    }
  }, [state, router]);

  const tenantUrl = `https://${state.namespace}.cloudappdev.io`;

  const handleStartOver = () => {
    reset();
    router.push('/register/plan');
  };

  if (!state.namespace) {
    return null;
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
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
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Your Organization is Ready!
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Congratulations! Your travel itinerary platform has been created
          successfully.
        </p>

        {/* Organization Details */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Your Details
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organization
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {state.organizationName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {state.tier}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Admin Email
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {state.adminEmail}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your Platform URL
              </p>
              <a
                href={tenantUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {tenantUrl}
              </a>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-4">
            Next Steps
          </h3>

          <ol className="space-y-3 text-blue-700 dark:text-blue-300">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                1
              </span>
              <span>
                Go to your platform URL:{' '}
                <a
                  href={tenantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  {state.namespace}.cloudappdev.io
                </a>
              </span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                2
              </span>
              <span>Login with your admin credentials</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                3
              </span>
              <span>Start creating itineraries and invite your team!</span>
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={tenantUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
          >
            Go to Your Platform
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>

          <button
            onClick={handleStartOver}
            className="px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Register Another
          </button>
        </div>
      </div>
    </div>
  );
}
