import React from "react";

interface ResumeNotificationProps {
  pendingMangaCount: number;
  onResumeMatching: () => void;
  onCancelResume: () => void;
}

export const ResumeNotification: React.FC<ResumeNotificationProps> = ({
  pendingMangaCount,
  onResumeMatching,
  onCancelResume,
}) => {
  // Don't render anything if there are no pending manga
  if (pendingMangaCount <= 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/30">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Unfinished Matching Process Detected
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              We&apos;ve detected {pendingMangaCount} manga that weren&apos;t
              processed in your previous session.
            </p>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={onResumeMatching}
                className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none dark:bg-yellow-700 dark:hover:bg-yellow-600"
              >
                Resume Matching Process
              </button>
              <button
                onClick={onCancelResume}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
