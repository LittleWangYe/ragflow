import { ChatSearchParams } from '@/constants/chat';
import api from '@/utils/api';
import { useSearchParams } from 'umi';

/**
 * 读取路由 search 参数中的 conversationApi 字段并返回对应的会话接口 URL。
 * 支持的值：
 * - "deepinsightConferenceQuestion" -> api.deepinsightConferenceQuestion
 * - "deepinsightChat" -> api.deepinsightChat
 * 默认回退到 api.completeConversation
 */
export const useConversationApi = (): string => {
  const [params] = useSearchParams();
  const v = params.get(ChatSearchParams.ConversationApi) || '';

  if (v === 'deepinsightConferenceQuestion')
    return api.deepinsightConferenceQuestion;
  if (v === 'deepinsightChat') return api.deepinsightChat;

  return api.completeConversation;
};

export default useConversationApi;
