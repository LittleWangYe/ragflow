// 高级示例：使用 AbortController 自动管理请求生命周期

import { useEffect, useRef } from 'react';
import { useLocation } from 'umi';

/**
 * 用于管理路由变化时的请求取消
 * 当路由变化时，自动 abort 所有待中的请求
 *
 * 使用方式：
 * const { getAbortSignal, abortAll } = useAbortOnRouteChange();
 *
 * // 在 fetch 时使用
 * const response = await fetch(url, {
 *   signal: getAbortSignal(),
 * });
 */
export const useAbortOnRouteChange = () => {
  const abortControllersRef = useRef<Set<AbortController>>(new Set());
  const location = useLocation();

  const abortAll = () => {
    abortControllersRef.current.forEach((controller) => {
      try {
        controller.abort();
      } catch (e) {
        // 忽略已经 abort 的 controller
      }
    });
    abortControllersRef.current.clear();
  };

  // 当路由变化时，abort 所有待中的请求
  useEffect(() => {
    return () => {
      abortAll();
    };
  }, [location.pathname]);

  const getAbortSignal = () => {
    const controller = new AbortController();
    abortControllersRef.current.add(controller);

    // 监听 abort 事件以清理
    const onAbort = () => {
      abortControllersRef.current.delete(controller);
    };
    controller.signal.addEventListener('abort', onAbort);

    return controller.signal;
  };

  return { getAbortSignal, abortAll };
};

/**
 * 专门针对 React Query 的 AbortSignal 管理
 * 自动处理路由变化时的请求取消
 */
export const useQueryAbortSignal = () => {
  const { getAbortSignal } = useAbortOnRouteChange();

  return {
    signal: getAbortSignal(),
  };
};

/**
 * 在数据获取 hooks 中使用的高级模式
 *
 * 使用方式：
 * const { signal } = useQueryAbortSignal();
 *
 * const { data } = useQuery({
 *   queryKey: ['data'],
 *   queryFn: async () => {
 *     const response = await fetch('/api/data', { signal });
 *     return response.json();
 *   },
 * });
 */

/**
 * 更简洁的使用方式：创建一个通用的 fetch wrapper
 */
export const useFetchWithAbort = () => {
  const { getAbortSignal } = useAbortOnRouteChange();

  const fetchData = async <T>(
    url: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      signal: getAbortSignal(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  };

  return { fetchData };
};
