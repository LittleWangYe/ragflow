import { Button } from '@/components/ui/button';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

/**
 * Fallback component when stream request errors occur
 */
function StreamErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="p-6 bg-red-50 border border-red-200 rounded-lg text-center flex flex-col gap-4"
    >
      <div className="flex items-center justify-center">
        <div className="text-red-600">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold">
            {t('message.requestError') || 'Request Error'}
          </h3>
          <p className="text-sm text-red-500 mt-2">
            {error?.message ||
              t('message.networkAnomaly') ||
              'An error occurred while processing your request'}
          </p>
        </div>
      </div>
      <Button onClick={resetErrorBoundary} className="w-full" variant="default">
        {t('chat.retry') || 'Retry'}
      </Button>
    </div>
  );
}

interface StreamErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * ErrorBoundary wrapper for stream-related components
 * Catches and displays errors from stream requests (deepinsightChat, deepinsightConferenceQuestion, completeConversation)
 */
export function StreamErrorBoundary({
  children,
  onError,
}: StreamErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(
      'Stream request error caught by ErrorBoundary:',
      error,
      errorInfo,
    );
    onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary
      FallbackComponent={StreamErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset error boundary and allow retry
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
