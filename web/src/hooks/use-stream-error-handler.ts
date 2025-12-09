import i18n from '@/locales/config';
import { message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ServerStatus {
  isConnected: boolean;
  lastCheckTime: number;
  failureCount: number;
}

/**
 * Hook to monitor server connection status
 * Provides early detection of server downtime and offers retry logic
 *
 * Usage:
 * const { isConnected, retryConnection, failureCount } = useServerConnectionMonitor();
 *
 * if (!isConnected) {
 *   // Show error message or retry button
 * }
 */
export const useServerConnectionMonitor = (
  url: string = '/v1/system/status',
) => {
  const [status, setStatus] = useState<ServerStatus>({
    isConnected: true,
    lastCheckTime: Date.now(),
    failureCount: 0,
  });

  const abortControllerRef = useRef<AbortController>();
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  // Check server health
  const checkServerHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Set a timeout for the health check
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus((prev) => ({
          ...prev,
          isConnected: true,
          failureCount: 0,
          lastCheckTime: Date.now(),
        }));
        retryCountRef.current = 0;
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      console.error('Server health check failed:', error);
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        failureCount: prev.failureCount + 1,
        lastCheckTime: Date.now(),
      }));

      if (retryCountRef.current < 3) {
        retryCountRef.current++;
        // Retry after 2 seconds
        checkTimeoutRef.current = setTimeout(checkServerHealth, 2000);
      } else {
        message.error(
          i18n.t('message.serverUnavailable') ||
            'Server is currently unavailable. Please try again later.',
        );
      }
    }
  }, [url]);

  // Start monitoring on mount
  useEffect(() => {
    // Initial check
    checkServerHealth();

    // Set up periodic checks (every 30 seconds)
    const intervalId = setInterval(() => {
      checkServerHealth();
    }, 30000);

    return () => {
      clearInterval(intervalId);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, [checkServerHealth]);

  const retryConnection = useCallback(async () => {
    retryCountRef.current = 0;
    await checkServerHealth();
  }, [checkServerHealth]);

  return {
    isConnected: status.isConnected,
    failureCount: status.failureCount,
    lastCheckTime: status.lastCheckTime,
    retryConnection,
  };
};

/**
 * Hook to handle stream request errors with automatic retry logic
 * Provides exponential backoff retry strategy
 *
 * Usage:
 * const { retryStream, canRetry, retryCount } = useStreamErrorHandler();
 *
 * if (streamError) {
 *   return <button onClick={() => retryStream(originalRequest)}>Retry</button>;
 * }
 */
export const useStreamErrorHandler = () => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const getBackoffDelay = useCallback((attempt: number) => {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attempt), 8000);
  }, []);

  const retryStream = useCallback(
    async (
      requestFn: () => Promise<any>,
      onRetry?: (attempt: number) => void,
    ) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          setRetryCount(attempt);
          if (attempt > 0) {
            onRetry?.(attempt);
            const delay = getBackoffDelay(attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
            message.info(
              i18n.t('message.retrying') ||
                `Retrying... (Attempt ${attempt}/${maxRetries})`,
            );
          }

          const result = await requestFn();
          setRetryCount(0);
          return result;
        } catch (error) {
          lastError = error as Error;
          console.error(`Stream retry attempt ${attempt + 1} failed:`, error);

          if (attempt === maxRetries) {
            message.error(
              i18n.t('message.requestFailed') ||
                'Request failed after multiple retries. Please try again later.',
            );
          }
        }
      }

      throw lastError;
    },
    [maxRetries, getBackoffDelay],
  );

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
  }, []);

  return {
    retryStream,
    canRetry: retryCount < maxRetries,
    retryCount,
    resetRetryCount,
    maxRetries,
  };
};
