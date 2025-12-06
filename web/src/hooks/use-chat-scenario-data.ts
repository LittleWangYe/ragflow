/**
 * 聊天场景数据获取 Hook
 * 处理流式数据获取、会话列表、聊天内容等
 */

import { useGetChatSearchParams } from '@/hooks/chat-hooks';
import {
  useCreateSession,
  useInitChatScenario,
  useUpdateSessionMessages,
} from '@/hooks/use-chat-scenario';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 会话列表数据
 */
export interface SessionListData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

/**
 * 流式数据回调类型
 */
export type StreamingDataCallback = (chunk: string) => void;

/**
 * 聊天数据获取状态
 */
export interface ChatDataFetchState {
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
}

/**
 * 获取会话列表 Hook
 */
export function useFetchScenarioSessions() {
  const { dialogId, conversationApi } = useGetChatSearchParams();
  const [sessions, setSessions] = useState<SessionListData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogId) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError(null);

      try {
        // TODO: 调用实际的 API 获取会话列表
        // 根据 conversationApi 调用不同的后端端点
        // const response = await chatService.listConversation({
        //   dialogId,
        //   conversationApi,
        // });

        // 模拟数据
        setSessions([]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch sessions',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [dialogId, conversationApi]);

  return { sessions, loading, error };
}

/**
 * 获取聊天内容 Hook
 * 支持流式数据获取
 */
export function useFetchChatContent() {
  const { conversationId, dialogId, conversationApi } =
    useGetChatSearchParams();
  const { isInitialized, manager } = useInitChatScenario();
  const { updateMessages, updateStreamingStatus } = useUpdateSessionMessages();

  const [state, setState] = useState<ChatDataFetchState>({
    loading: false,
    error: null,
    isStreaming: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeElapsedRef = useRef(0);

  /**
   * 开始计时
   */
  const startTimer = useCallback(() => {
    timeElapsedRef.current = 0;
    timerRef.current = setInterval(() => {
      timeElapsedRef.current += 1;
    }, 1000);
  }, []);

  /**
   * 停止计时
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 获取流式聊天数据
   */
  const fetchChatContentStreaming = useCallback(
    async (message: string, onStreamChunk?: StreamingDataCallback) => {
      if (!conversationId || !dialogId) return;

      abortControllerRef.current = new AbortController();
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        isStreaming: true,
      }));

      startTimer();

      try {
        // TODO: 实现流式数据获取
        // const response = await fetch(api.completeConversation, {
        //   method: 'POST',
        //   signal: abortControllerRef.current.signal,
        //   body: JSON.stringify({
        //     dialog_id: dialogId,
        //     conversation_id: conversationId,
        //     message,
        //     conversation_api: conversationApi,
        //   }),
        // });

        // const reader = response.body?.getReader();
        // if (reader) {
        //   while (true) {
        //     const { done, value } = await reader.read();
        //     if (done) break;

        //     const chunk = new TextDecoder().decode(value);
        //     onStreamChunk?.(chunk);
        //   }
        // }

        updateStreamingStatus(conversationId, false);
        setState((prev) => ({ ...prev, isStreaming: false }));
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch chat content';
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            isStreaming: false,
          }));
        }
      } finally {
        stopTimer();
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [
      conversationId,
      dialogId,
      conversationApi,
      startTimer,
      stopTimer,
      updateStreamingStatus,
    ],
  );

  /**
   * 停止流式传输
   */
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopTimer();
    updateStreamingStatus(conversationId, false);
    setState((prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }, [conversationId, stopTimer, updateStreamingStatus]);

  // 清理资源
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    ...state,
    fetchChatContentStreaming,
    stopStreaming,
    timeElapsed: timeElapsedRef.current,
  };
}

/**
 * 管理会话切换和数据同步 Hook
 */
export function useManageChatSession() {
  const { conversationId } = useGetChatSearchParams();
  const { isInitialized, manager } = useInitChatScenario();
  const { createSession } = useCreateSession();
  const [sessionState, setSessionState] = useState({
    currentSessionId: conversationId,
    isNew: false,
  });

  const switchSession = useCallback(
    (newSessionId: string, isNew: boolean = false) => {
      manager.setActiveSession(newSessionId);
      setSessionState({
        currentSessionId: newSessionId,
        isNew,
      });
    },
    [manager],
  );

  const createNewSession = useCallback(
    (sessionName: string, metadata?: Record<string, any>) => {
      const sessionId = `session_${Date.now()}`;
      createSession(sessionId, sessionName, metadata);
      switchSession(sessionId, true);
      return sessionId;
    },
    [createSession, switchSession],
  );

  return {
    isInitialized,
    currentSessionId: sessionState.currentSessionId,
    isNewSession: sessionState.isNew,
    switchSession,
    createNewSession,
  };
}
