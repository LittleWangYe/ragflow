/**
 * 聊天场景上下文 - 用于数据隔离和场景管理
 * 支持多个独立的聊天场景，每个场景有独立的状态和数据
 */

import { createContext } from 'react';

export enum ChatScenario {
  Ask = 'ask', // 问一问
  Conference = 'deepinsightConferenceQuestion', // 顶会洞察
  DeepInsight = 'deepinsightChat', // 深度研究
}

/**
 * 聊天场景配置
 */
export interface ChatScenarioConfig {
  /** 场景唯一标识 */
  scenario: ChatScenario;
  /** 对话API类型 */
  conversationApi: string;
  /** 场景名称 */
  name: string;
  /** 场景描述 */
  description?: string;
}

/**
 * 会话数据隔离结构
 */
export interface ScenarioSessionData {
  /** 对话ID */
  conversationId: string;
  /** 是否为新会话 */
  isNew: boolean;
  /** 会话名称 */
  name: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 消息列表 */
  messages: any[];
  /** 参考资料 */
  references?: any[];
  /** 流式传输状态 */
  isStreaming?: boolean;
  /** 计时器 */
  timer?: number;
  /** 自定义数据 */
  metadata?: Record<string, any>;
}

/**
 * 场景数据容器 - 隔离不同场景的所有数据
 */
export interface ScenarioDataContainer {
  /** 当前场景 */
  currentScenario: ChatScenario;
  /** 当前对话ID */
  currentDialogId: string;
  /** 场景内的所有会话 */
  sessions: Map<string, ScenarioSessionData>;
  /** 当前活跃会话ID */
  activeSessionId: string | null;
  /** 场景级别的临时数据 */
  scenarioMetadata: Record<string, any>;
}

/**
 * 聊天场景管理器接口
 */
export interface ChatScenarioManager {
  /** 初始化场景 */
  initScenario(scenario: ChatScenario, dialogId: string): void;
  /** 获取当前场景数据容器 */
  getScenarioData(): ScenarioDataContainer;
  /** 创建新会话 */
  createSession(
    conversationId: string,
    name: string,
    metadata?: Record<string, any>,
  ): void;
  /** 获取会话数据 */
  getSession(sessionId: string): ScenarioSessionData | undefined;
  /** 更新会话消息 */
  updateSessionMessages(sessionId: string, messages: any[]): void;
  /** 更新会话流式状态 */
  updateSessionStreamingStatus(sessionId: string, isStreaming: boolean): void;
  /** 获取场景内所有会话 */
  getAllSessions(): ScenarioSessionData[];
  /** 删除会话 */
  deleteSession(sessionId: string): void;
  /** 清空场景数据 */
  clearScenario(): void;
  /** 切换活跃会话 */
  setActiveSession(sessionId: string | null): void;
}

/**
 * 场景上下文
 */
export const ChatScenarioContext = createContext<ChatScenarioManager | null>(
  null,
);

/**
 * 场景配置映射表
 */
export const SCENARIO_CONFIG_MAP: Record<ChatScenario, ChatScenarioConfig> = {
  [ChatScenario.Ask]: {
    scenario: ChatScenario.Ask,
    conversationApi: '',
    name: '问一问',
    description: '基础问答场景',
  },
  [ChatScenario.Conference]: {
    scenario: ChatScenario.Conference,
    conversationApi: 'deepinsightConferenceQuestion',
    name: '顶会洞察',
    description: '会议洞察场景',
  },
  [ChatScenario.DeepInsight]: {
    scenario: ChatScenario.DeepInsight,
    conversationApi: 'deepinsightChat',
    name: '深度研究',
    description: '深度研究场景',
  },
};
