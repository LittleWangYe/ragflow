import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'umi';

/**
 * 导航锁定 Hook
 * 用于在路由转换过程中追踪导航状态，防止用户快速切换菜单导致页面和菜单显示不同步
 * 同时在路由切换时自动中止前一个页面的请求，防止数据污染
 *
 * @returns {object} 返回导航相关的状态和方法
 */
export const useNavigationLock = () => {
  const { pathname, search } = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxNavigationTimeRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 启动导航锁定并中止前一个页面的请求
   * @param path 目标路径
   */
  const startNavigation = (path: string) => {
    // 中止前一个页面的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsNavigating(true);
    setTargetPath(path);

    // 设置最大导航超时时间（3秒），防止永久锁定
    if (maxNavigationTimeRef.current) {
      clearTimeout(maxNavigationTimeRef.current);
    }
    maxNavigationTimeRef.current = setTimeout(() => {
      setIsNavigating(false);
      setTargetPath(null);
    }, 3000);
  };

  /**
   * 获取用于请求的 AbortSignal
   * 在路由变化时会自动中止该信号的所有请求
   * @returns AbortSignal
   *
   * @example
   * const signal = getAbortSignal();
   * fetch(url, { signal });
   */
  const getAbortSignal = () => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current.signal;
  };

  /**
   * 监听路由变化，自动解除导航锁定
   */
  useEffect(() => {
    if (!isNavigating || !targetPath) {
      return;
    }

    const currentFullPath = pathname + search;

    // 如果路由已更新，延迟后解除锁定以确保页面组件已挂载
    if (currentFullPath === targetPath) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        setTargetPath(null);
        if (maxNavigationTimeRef.current) {
          clearTimeout(maxNavigationTimeRef.current);
          maxNavigationTimeRef.current = null;
        }
      }, 150); // 150ms 延迟以确保页面组件已挂载
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [pathname, search, isNavigating, targetPath]);

  /**
   * 清理超时计时器
   */
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (maxNavigationTimeRef.current) {
        clearTimeout(maxNavigationTimeRef.current);
      }
    };
  }, []);

  return {
    isNavigating,
    startNavigation,
    getAbortSignal, // 用于在请求中使用，在路由切换时自动中止
  };
};
