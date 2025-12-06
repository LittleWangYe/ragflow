/**
 * 聊天场景提供者 - 在应用中提供场景管理上下文
 */

import { ChatScenarioContext } from '@/contexts/chat-scenario-context';
import { createChatScenarioManager } from '@/contexts/chat-scenario-manager';
import React, { useMemo } from 'react';

interface ChatScenarioProviderProps {
  children: React.ReactNode;
}

/**
 * 聊天场景提供者组件
 * 在需要场景隔离的页面包装使用
 */
export function ChatScenarioProvider({ children }: ChatScenarioProviderProps) {
  const manager = useMemo(() => createChatScenarioManager(), []);

  return (
    <ChatScenarioContext.Provider value={manager}>
      {children}
    </ChatScenarioContext.Provider>
  );
}
