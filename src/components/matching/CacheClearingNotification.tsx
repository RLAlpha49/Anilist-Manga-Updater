import React from "react";

interface CacheClearingNotificationProps {
  cacheClearingCount: number;
}

export const CacheClearingNotification: React.FC<
  CacheClearingNotificationProps
> = ({ cacheClearingCount }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30"></div>
      <div className="relative mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-xl dark:bg-gray-800">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="h-8 w-8 animate-spin text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Clearing Cache
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Clearing cache for {cacheClearingCount} selected manga. This may
            cause a brief lag. Please wait...
          </p>
        </div>
      </div>
    </div>
  );
};
