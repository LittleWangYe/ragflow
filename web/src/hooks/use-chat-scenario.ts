/**
 * 聊天场景管理 Hooks
 * 提供场景初始化、会话管理、数据隔离等功能
 */

import {
  ChatScenario,
  ChatScenarioManager,
  ScenarioSessionData,
} from '@/contexts/chat-scenario-context';
import {
  createChatScenarioManager,
  getGlobalScenarioManager,
} from '@/contexts/chat-scenario-manager';
import { useGetChatSearchParams } from '@/hooks/chat-hooks';
import { useEffect, useRef, useState } from 'react';

/**
 * 使用场景管理器 Hook
 * 获取或创建当前场景的管理器实例
 */
export function useScenarioManager(): ChatScenarioManager {
  const managerRef = useRef<ChatScenarioManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = createChatScenarioManager();
  }

  return managerRef.current;
}

/**
 * 初始化聊天场景 Hook
 * 根据 URL 参数初始化对应的聊天场景
 */
export function useInitChatScenario() {
  const { dialogId, conversationApi } = useGetChatSearchParams();
  const manager = useScenarioManager();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (dialogId) {
      // 根据 conversationApi 确定场景
      let scenario: ChatScenario = ChatScenario.Ask;

      if (conversationApi === 'deepinsightConferenceQuestion') {
        scenario = ChatScenario.Conference;
      } else if (conversationApi === 'deepinsightChat') {
        scenario = ChatScenario.DeepInsight;
      }

      manager.initScenario(scenario, dialogId);
      setIsInitialized(true);
    }
  }, [dialogId, conversationApi, manager]);

  return { isInitialized, manager };
}

/**
 * 获取当前场景的所有会话 Hook
 */
export function useScenarioSessions(): ScenarioSessionData[] {
  const manager = useScenarioManager();
  const [sessions, setSessions] = useState<ScenarioSessionData[]>([]);

  useEffect(() => {
    const allSessions = manager.getAllSessions();
    setSessions(allSessions);
  }, [manager]);

  return sessions;
}

/**
 * 获取当前活跃会话 Hook
 */
export function useActiveSession(): ScenarioSessionData | null {
  const manager = useScenarioManager();
  const [activeSession, setActiveSession] =
    useState<ScenarioSessionData | null>(null);

  useEffect(() => {
    const container = manager.getScenarioData();
    if (container.activeSessionId) {
      const session = manager.getSession(container.activeSessionId);
      setActiveSession(session || null);
    } else {
      setActiveSession(null);
    }
  }, [manager]);

  return activeSession;
}

/**
 * 管理会话创建 Hook
 */
export function useCreateSession() {
  const manager = useScenarioManager();
  const [, setSessions] = useState<ScenarioSessionData[]>([]);

  const createSession = (
    conversationId: string,
    name: string,
    metadata?: Record<string, any>,
  ) => {
    manager.createSession(conversationId, name, metadata);

    // 更新会话列表
    setSessions(manager.getAllSessions());
  };

  return { createSession };
}

/**
 * 管理会话消息更新 Hook
 */
export function useUpdateSessionMessages() {
  const manager = useScenarioManager();

  const updateMessages = (sessionId: string, messages: any[]) => {
    manager.updateSessionMessages(sessionId, messages);
  };

  const updateStreamingStatus = (sessionId: string, isStreaming: boolean) => {
    manager.updateSessionStreamingStatus(sessionId, isStreaming);
  };

  return { updateMessages, updateStreamingStatus };
}

/**
 * 管理会话删除 Hook
 */
export function useDeleteSession() {
  const manager = useScenarioManager();
  const [, setSessions] = useState<ScenarioSessionData[]>([]);

  const deleteSession = (sessionId: string) => {
    manager.deleteSession(sessionId);
    setSessions(manager.getAllSessions());
  };

  return { deleteSession };
}

/**
 * 获取全局场景管理器 Hook（用于跨页面访问）
 */
export function useGlobalScenarioManager(): ChatScenarioManager {
  return getGlobalScenarioManager();
}
