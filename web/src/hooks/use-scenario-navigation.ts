/**
 * 聊天场景导航 Hook
 * 处理场景切换、路由更新、状态同步等
 */

import { ChatSearchParams } from '@/constants/chat';
import {
  ChatScenario,
  SCENARIO_CONFIG_MAP,
} from '@/contexts/chat-scenario-context';
import { Routes } from '@/routes';
import { useCallback } from 'react';
import { useSearchParams } from 'umi';

/**
 * 场景导航配置
 */
export interface ScenarioNavigationConfig {
  scenario: ChatScenario;
  dialogId: string;
  conversationId?: string;
  isNew?: boolean;
}

/**
 * 场景导航 Hook
 */
export function useScenarioNavigation() {
  const [, setSearchParams] = useSearchParams();

  /**
   * 导航到特定场景
   */
  const navigateToScenario = useCallback(
    (config: ScenarioNavigationConfig) => {
      const scenarioConfig = SCENARIO_CONFIG_MAP[config.scenario];
      const params = new URLSearchParams();

      // 设置基础参数
      params.set(ChatSearchParams.DialogId, config.dialogId);

      // 设置 conversationApi 参数（如果不是基础问答场景）
      if (scenarioConfig.conversationApi) {
        params.set(
          ChatSearchParams.ConversationApi,
          scenarioConfig.conversationApi,
        );
      }

      // 设置会话相关参数
      if (config.conversationId) {
        params.set(ChatSearchParams.ConversationId, config.conversationId);
      }

      if (config.isNew !== undefined) {
        params.set(ChatSearchParams.isNew, config.isNew ? 'true' : 'false');
      }

      setSearchParams(params);
    },
    [setSearchParams],
  );

  /**
   * 导航到问一问场景
   */
  const navigateToAsk = useCallback(
    (dialogId: string, conversationId?: string, isNew?: boolean) => {
      navigateToScenario({
        scenario: ChatScenario.Ask,
        dialogId,
        conversationId,
        isNew,
      });
    },
    [navigateToScenario],
  );

  /**
   * 导航到顶会洞察场景
   */
  const navigateToConference = useCallback(
    (dialogId: string, conversationId?: string, isNew?: boolean) => {
      navigateToScenario({
        scenario: ChatScenario.Conference,
        dialogId,
        conversationId,
        isNew,
      });
    },
    [navigateToScenario],
  );

  /**
   * 导航到深度研究场景
   */
  const navigateToDeepInsight = useCallback(
    (dialogId: string, conversationId?: string, isNew?: boolean) => {
      navigateToScenario({
        scenario: ChatScenario.DeepInsight,
        dialogId,
        conversationId,
        isNew,
      });
    },
    [navigateToScenario],
  );

  return {
    navigateToScenario,
    navigateToAsk,
    navigateToConference,
    navigateToDeepInsight,
  };
}

/**
 * 获取当前场景的路由信息 Hook
 */
export function useCurrentScenarioRoute() {
  const [searchParams] = useSearchParams();

  const dialogId = searchParams.get(ChatSearchParams.DialogId) || '';
  const conversationId =
    searchParams.get(ChatSearchParams.ConversationId) || '';
  const conversationApi =
    searchParams.get(ChatSearchParams.ConversationApi) || '';
  const isNew = searchParams.get(ChatSearchParams.isNew) === 'true';

  // 根据 conversationApi 判断当前场景
  let currentScenario: ChatScenario = ChatScenario.Ask;
  if (conversationApi === 'deepinsightConferenceQuestion') {
    currentScenario = ChatScenario.Conference;
  } else if (conversationApi === 'deepinsightChat') {
    currentScenario = ChatScenario.DeepInsight;
  }

  const scenarioConfig = SCENARIO_CONFIG_MAP[currentScenario];

  return {
    dialogId,
    conversationId,
    conversationApi,
    isNew,
    currentScenario,
    scenarioConfig,
  };
}

/**
 * 构建场景路由 URL Hook
 */
export function useBuildScenarioUrl() {
  const buildScenarioUrl = useCallback(
    (config: ScenarioNavigationConfig): string => {
      const scenarioConfig = SCENARIO_CONFIG_MAP[config.scenario];
      const params = new URLSearchParams();

      params.set(ChatSearchParams.DialogId, config.dialogId);

      if (scenarioConfig.conversationApi) {
        params.set(
          ChatSearchParams.ConversationApi,
          scenarioConfig.conversationApi,
        );
      }

      if (config.conversationId) {
        params.set(ChatSearchParams.ConversationId, config.conversationId);
      }

      if (config.isNew !== undefined) {
        params.set(ChatSearchParams.isNew, config.isNew ? 'true' : 'false');
      }

      const queryString = params.toString();
      return queryString
        ? `${Routes.Chat}/${config.dialogId}?${queryString}`
        : `${Routes.Chat}/${config.dialogId}`;
    },
    [],
  );

  return { buildScenarioUrl };
}
