/**
 * 聊天场景数据管理器 - 实现数据隔离和会话管理
 */

import {
  ChatScenario,
  ChatScenarioManager,
  ScenarioDataContainer,
  ScenarioSessionData,
} from './chat-scenario-context';

/**
 * 创建场景数据管理器
 */
export function createChatScenarioManager(): ChatScenarioManager {
  // 存储每个场景的数据容器
  const scenarioDataMap = new Map<ChatScenario, ScenarioDataContainer>();

  /**
   * 初始化或获取场景数据容器
   */
  const ensureScenarioData = (
    scenario: ChatScenario,
    dialogId: string,
  ): ScenarioDataContainer => {
    if (!scenarioDataMap.has(scenario)) {
      scenarioDataMap.set(scenario, {
        currentScenario: scenario,
        currentDialogId: dialogId,
        sessions: new Map(),
        activeSessionId: null,
        scenarioMetadata: {},
      });
    }

    const container = scenarioDataMap.get(scenario)!;
    container.currentDialogId = dialogId;
    return container;
  };

  return {
    initScenario(scenario: ChatScenario, dialogId: string) {
      ensureScenarioData(scenario, dialogId);
    },

    getScenarioData(): ScenarioDataContainer {
      // 返回最后初始化的场景数据，如果没有则返回空容器
      if (scenarioDataMap.size === 0) {
        return {
          currentScenario: ChatScenario.Ask,
          currentDialogId: '',
          sessions: new Map(),
          activeSessionId: null,
          scenarioMetadata: {},
        };
      }

      return Array.from(scenarioDataMap.values())[
        scenarioDataMap.size - 1
      ] as ScenarioDataContainer;
    },

    createSession(
      conversationId: string,
      name: string,
      metadata?: Record<string, any>,
    ) {
      const container = this.getScenarioData();

      const session: ScenarioSessionData = {
        conversationId,
        isNew: true,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        references: [],
        isStreaming: false,
        timer: 0,
        metadata: metadata || {},
      };

      container.sessions.set(conversationId, session);

      // 自动设置为活跃会话
      if (!container.activeSessionId) {
        container.activeSessionId = conversationId;
      }
    },

    getSession(sessionId: string): ScenarioSessionData | undefined {
      const container = this.getScenarioData();
      return container.sessions.get(sessionId);
    },

    updateSessionMessages(sessionId: string, messages: any[]) {
      const session = this.getSession(sessionId);
      if (session) {
        session.messages = messages;
        session.updatedAt = Date.now();
        session.isNew = false;
      }
    },

    updateSessionStreamingStatus(sessionId: string, isStreaming: boolean) {
      const session = this.getSession(sessionId);
      if (session) {
        session.isStreaming = isStreaming;
      }
    },

    getAllSessions(): ScenarioSessionData[] {
      const container = this.getScenarioData();
      return Array.from(container.sessions.values());
    },

    deleteSession(sessionId: string) {
      const container = this.getScenarioData();
      container.sessions.delete(sessionId);

      if (container.activeSessionId === sessionId) {
        const remainingSessions = Array.from(container.sessions.keys());
        container.activeSessionId = remainingSessions[0] || null;
      }
    },

    clearScenario() {
      const container = this.getScenarioData();
      container.sessions.clear();
      container.activeSessionId = null;
      container.scenarioMetadata = {};
    },

    setActiveSession(sessionId: string | null) {
      const container = this.getScenarioData();
      container.activeSessionId = sessionId;
    },
  };
}

/**
 * 全局单例实例
 */
let globalScenarioManager: ChatScenarioManager | null = null;

/**
 * 获取全局场景管理器单例
 */
export function getGlobalScenarioManager(): ChatScenarioManager {
  if (!globalScenarioManager) {
    globalScenarioManager = createChatScenarioManager();
  }
  return globalScenarioManager;
}

/**
 * 重置全局管理器（用于测试或场景切换）
 */
export function resetGlobalScenarioManager() {
  globalScenarioManager = null;
}
