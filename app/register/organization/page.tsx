'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '../context/RegistrationContext';

export default function OrganizationPage() {
  const router = useRouter();
  const { state, setOrganization } = useRegistration();

  const [organizationName, setOrganizationName] = useState(
    state.organizationName
  );
  const [namespace, setNamespace] = useState(state.namespace);
  const [namespaceStatus, setNamespaceStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [namespaceMessage, setNamespaceMessage] = useState('');

  // Redirect if no tier selected
  useEffect(() => {
    if (!state.tier) {
      router.push('/register/plan');
    }
  }, [state.tier, router]);

  // Check namespace availability with debounce
  useEffect(() => {
    if (!namespace || namespace.length < 3) {
      setNamespaceStatus('idle');
      setNamespaceMessage('');
      return;
    }

    // Validate namespace format
    const namespaceRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!namespaceRegex.test(namespace)) {
      setNamespaceStatus('invalid');
      setNamespaceMessage(
        'Must be lowercase letters, numbers, and hyphens only'
      );
      return;
    }

    const checkNamespace = async () => {
      setNamespaceStatus('checking');
      try {
        const response = await fetch(
          `/api/register/check-namespace?namespace=${namespace}`
        );
        const data = await response.json();

        if (data.available) {
          setNamespaceStatus('available');
          setNamespaceMessage('Namespace is available');
        } else {
          setNamespaceStatus('taken');
          setNamespaceMessage(data.reason || 'Namespace is not available');
        }
      } catch (error) {
        setNamespaceStatus('idle');
        setNamespaceMessage('Could not check availability');
      }
    };

    const timeoutId = setTimeout(checkNamespace, 500);
    return () => clearTimeout(timeoutId);
  }, [namespace]);

  const handleContinue = () => {
    if (
      organizationName &&
      namespace &&
      namespaceStatus === 'available'
    ) {
      setOrganization(organizationName, namespace);
      router.push('/register/admin');
    }
  };

  const handleBack = () => {
    router.push('/register/plan');
  };

  const getNamespaceStatusColor = () => {
    switch (namespaceStatus) {
      case 'available':
        return 'text-green-600 dark:text-green-400';
      case 'taken':
      case 'invalid':
        return 'text-red-600 dark:text-red-400';
      case 'checking':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold">
              <svg
                className="w-5 h-5"
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
            <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
              {state.tier?.charAt(0).toUpperCase()}
              {state.tier?.slice(1)}
            </span>
          </div>
          <div className="w-16 h-0.5 bg-blue-600" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
              2
            </div>
            <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
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

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Organization Details
        </h2>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Organization Name
            </label>
            <input
              type="text"
              id="organizationName"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="My Travel Company"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="namespace"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Namespace (URL)
            </label>
            <div className="flex items-center">
              <input
                type="text"
                id="namespace"
                value={namespace}
                onChange={(e) =>
                  setNamespace(e.target.value.toLowerCase().replace(/\s/g, '-'))
                }
                placeholder="my-travel-company"
                className="flex-1 px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="px-4 py-3 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-500 dark:text-gray-400">
                .cloudappdev.site
              </span>
            </div>
            {namespaceMessage && (
              <p className={`mt-2 text-sm ${getNamespaceStatusColor()}`}>
                {namespaceStatus === 'checking' && (
                  <span className="inline-block animate-spin mr-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                )}
                {namespaceMessage}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This will be your platform URL. Min 3 characters.
            </p>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-lg font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={
              !organizationName ||
              !namespace ||
              namespaceStatus !== 'available'
            }
            className="px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
