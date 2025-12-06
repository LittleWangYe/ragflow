/**
 * Hook to initialize default dialogs after login
 * Ensures that the three special dialogs exist: 问一问, 顶会洞察, 深度研究
 */

import { IDialog } from '@/interfaces/database/chat';
import chatService from '@/services/next-chat-service';
import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

// Default dialog names
const DEFAULT_DIALOGS = {
  ASK: '问一问',
  CONFERENCE: '顶会洞察',
  DEEPINSIGHT: '深度研究',
};

// Default dialog configuration template
const getDefaultDialogConfig = (name: string) => ({
  name,
  icon: '',
  language: 'English',
  description: '',
  prompt_config: {
    empty_response: '',
    prologue: '你好！ 我是你的助理，有什么可以帮到你的吗？',
    quote: true,
    keyword: false,
    tts: false,
    system: `你是一个智能助手，请总结知识库的内容来回答问题，请列举知识库中的数据详细回答。当所有知识库内容都与问题无关时，你的回答必须包括"知识库中未找到您要的答案！"这句话。回答需要考虑聊天历史。
        以下是知识库：
        {knowledge}
        以上是知识库。`,
    refine_multiturn: false,
    use_kg: false,
    reasoning: false,
    parameters: [{ key: 'knowledge', optional: false }],
    toc_enhance: false,
  },
  llm_id: 'deepseek-chat@DeepSeek',
  llm_setting: {},
  similarity_threshold: 0.2,
  vector_similarity_weight: 0.3,
  top_n: 8,
});

export const useInitDefaultDialogs = () => {
  const { mutateAsync: createDialog, isPending: isCreating } = useMutation({
    mutationFn: async (config: Partial<IDialog>) => {
      const { data } = await chatService.setDialog(config);
      return data;
    },
  });

  const { mutateAsync: fetchDialogList, isPending: isFetching } = useMutation({
    mutationFn: async () => {
      const { data } = await chatService.listDialog({
        params: {
          keywords: '',
          page_size: 50,
          page: 1,
        },
      });
      return data?.data?.dialogs || [];
    },
  });

  const initializeDefaultDialogs = useCallback(async () => {
    try {
      // Step 1: Fetch current dialog list
      const currentDialogs: IDialog[] = await fetchDialogList();

      // Step 2: Check which default dialogs are missing
      const missingDialogs = Object.values(DEFAULT_DIALOGS).filter(
        (name) => !currentDialogs.some((dialog) => dialog.name === name),
      );

      // Step 3: If all default dialogs exist, return the list
      if (missingDialogs.length === 0) {
        // Save to local storage
        localStorage.setItem('defaultDialogs', JSON.stringify(currentDialogs));
        return { success: true, dialogs: currentDialogs };
      }

      // Step 4: Create missing dialogs
      const createPromises = missingDialogs.map((name) =>
        createDialog(getDefaultDialogConfig(name)),
      );

      await Promise.all(createPromises);

      // Step 5: Fetch dialog list again to get updated list with created dialogs
      const updatedDialogs: IDialog[] = await fetchDialogList();

      // Step 6: Save to local storage
      localStorage.setItem('defaultDialogs', JSON.stringify(updatedDialogs));

      return { success: true, dialogs: updatedDialogs };
    } catch (error) {
      console.error('Failed to initialize default dialogs:', error);
      return { success: false, error };
    }
  }, [createDialog, fetchDialogList]);

  return {
    initializeDefaultDialogs,
    isLoading: isCreating || isFetching,
  };
};
