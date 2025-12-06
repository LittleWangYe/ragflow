import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'umi';

interface ResourceContainer {
  abortControllers: AbortController[];
  webSockets: WebSocket[];
  timers: NodeJS.Timeout[];
  eventListeners: Array<{
    target: EventTarget;
    event: string;
    handler: EventListener;
  }>;
}

/**
 * 页面资源生命周期管理 Hook
 * 为每个 conversationApi 值维护独立的资源容器
 * 切换 conversationApi 时，旧的资源容器自动清理，新的资源容器独立管理
 * 这样可以完全隔离不同对话类型（顶会 vs 深度研究）的资源，互不污染
 */
export const usePageLifecycle = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const conversationApi = searchParams.get('conversationApi') || '';

  // 按 conversationApi 存储资源容器，实现完全隔离
  const resourcesMapRef = useRef<Record<string, ResourceContainer>>({});
  const prevApiRef = useRef<string>('');

  // 获取当前 conversationApi 对应的资源容器
  const getCurrentResources = useCallback(() => {
    const key = `${pathname}:${conversationApi}`;
    if (!resourcesMapRef.current[key]) {
      resourcesMapRef.current[key] = {
        abortControllers: [],
        webSockets: [],
        timers: [],
        eventListeners: [],
      };
    }
    return resourcesMapRef.current[key];
  }, [pathname, conversationApi]);

  /**
   * 获取用于 fetch 请求的 AbortSignal
   * 独立管理，不同的 conversationApi 有独立的 controller
   */
  const createFetchSignal = useCallback(() => {
    const resources = getCurrentResources();
    const controller = new AbortController();
    resources.abortControllers.push(controller);
    return controller.signal;
  }, [getCurrentResources]);

  /**
   * 创建 WebSocket 连接（自动管理生命周期）
   * 独立管理，不同的 conversationApi 有独立的 WebSocket
   */
  const createWebSocket = useCallback(
    (url: string, protocols?: string | string[]) => {
      const resources = getCurrentResources();
      const ws = new WebSocket(url, protocols);
      resources.webSockets.push(ws);

      return ws;
    },
    [getCurrentResources],
  );

  /**
   * 注册定时器（自动清除）
   * 独立管理，不同的 conversationApi 有独立的定时器
   */
  const setTimeout = useCallback(
    (callback: () => void, delay?: number) => {
      const resources = getCurrentResources();
      const id = global.setTimeout(callback, delay);
      resources.timers.push(id);
      return id;
    },
    [getCurrentResources],
  );

  /**
   * 注册事件监听器（自动移除）
   * 独立管理，不同的 conversationApi 有独立的事件监听器
   */
  const addEventListener = useCallback(
    (target: EventTarget, event: string, handler: EventListener) => {
      const resources = getCurrentResources();
      target.addEventListener(event, handler);
      resources.eventListeners.push({ target, event, handler });
    },
    [getCurrentResources],
  );

  /**
   * 清理指定资源容器的所有资源
   */
  const cleanupResources = useCallback((resources: ResourceContainer) => {
    // 中止所有请求
    resources.abortControllers.forEach((controller) => {
      controller.abort();
    });
    resources.abortControllers = [];

    // 关闭所有 WebSocket 连接
    resources.webSockets.forEach((ws) => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    });
    resources.webSockets = [];

    // 清除所有定时器
    resources.timers.forEach((id) => {
      clearTimeout(id);
    });
    resources.timers = [];

    // 移除所有事件监听器
    resources.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    resources.eventListeners = [];
  }, []);

  /**
   * 当 conversationApi 改变时，清理旧 API 对应的资源
   * 但保持新 API 的资源独立存在
   */
  useEffect(() => {
    if (prevApiRef.current && prevApiRef.current !== conversationApi) {
      // 清理旧 API 的资源容器
      const oldKey = `${pathname}:${prevApiRef.current}`;
      if (resourcesMapRef.current[oldKey]) {
        cleanupResources(resourcesMapRef.current[oldKey]);
        delete resourcesMapRef.current[oldKey];
      }
    }
    prevApiRef.current = conversationApi;
  }, [conversationApi, pathname, cleanupResources]);

  /**
   * 路由变化时清理当前路由对应的所有资源容器
   */
  useEffect(() => {
    const currentPathname = pathname;
    const resourcesMap = resourcesMapRef.current;

    return () => {
      // 组件卸载或 pathname 改变时，清理所有该路由下的资源
      Object.keys(resourcesMap).forEach((key) => {
        if (key.startsWith(`${currentPathname}:`)) {
          cleanupResources(resourcesMap[key]);
          delete resourcesMap[key];
        }
      });
    };
  }, [pathname, cleanupResources]);

  return {
    createFetchSignal,
    createWebSocket,
    setTimeout,
    addEventListener,
  };
};

/**
 * 辅助 Hook：创建独立的流式数据管理
 * 用于处理 EventSource 或 ReadableStream
 */
export const useStreamManager = () => {
  const streamsRef = useRef<
    Array<{
      reader?: ReadableStreamDefaultReader;
      eventSource?: EventSource;
      abort?: () => void;
    }>
  >([]);

  const createStreamReader = useCallback(
    async (response: Promise<Response>) => {
      const res = await response;
      if (!res.body) return null;

      const reader = res.body.getReader();
      streamsRef.current.push({ reader });

      return {
        read: async () => {
          try {
            return await reader.read();
          } catch (error) {
            console.error('Stream read error:', error);
            throw error;
          }
        },
      };
    },
    [],
  );

  const createEventSource = useCallback((url: string) => {
    const eventSource = new EventSource(url);
    streamsRef.current.push({ eventSource });
    return eventSource;
  }, []);

  const cleanup = useCallback(() => {
    streamsRef.current.forEach((stream) => {
      if (stream.reader) {
        stream.reader.cancel().catch(() => {});
      }
      if (stream.eventSource) {
        stream.eventSource.close();
      }
    });
    streamsRef.current = [];
  }, []);

  return {
    createStreamReader,
    createEventSource,
    cleanup,
  };
};
