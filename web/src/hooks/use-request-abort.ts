import { useEffect, useRef } from 'react';
import { useLocation } from 'umi';

/**
 * 请求中止 Hook
 * 在路由切换时自动中止前一个页面的未完成请求
 * 防止数据污染和性能问题
 */
export const useRequestAbort = () => {
  const { pathname } = useLocation();
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 创建新的 AbortController
   * 返回 signal 传给 fetch 请求
   */
  const createAbortSignal = () => {
    // 中止前一个请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  };

  /**
   * 监听路由变化，自动中止前一个页面的请求
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pathname]);

  return {
    /**
     * 创建用于 fetch 请求的 signal
     * @example
     * const signal = createAbortSignal();
     * fetch(url, { signal });
     */
    createAbortSignal,

    /**
     * 手动中止所有请求
     */
    abort: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
  };
};

/**
 * 包装 fetch 请求，自动处理请求中止
 * 在组件外部不能直接使用此函数，建议在页面组件中使用 useRequestAbort hook
 *
 * 或者可以通过以下方式在 API 客户端中使用：
 *
 * @example
 * // 在 API 中使用
 * export const fetchDatasets = async (signal?: AbortSignal) => {
 *   return fetch('/api/datasets', { signal });
 * };
 *
 * // 在组件中使用
 * const signal = createAbortSignal();
 * const data = await fetchDatasets(signal);
 */
