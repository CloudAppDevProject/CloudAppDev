import { RegistrationProvider } from './context/RegistrationContext';

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RegistrationProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              CloudAppDev
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create your travel itinerary platform
            </p>
          </div>
          {children}
        </div>
      </div>
    </RegistrationProvider>
  );
}
