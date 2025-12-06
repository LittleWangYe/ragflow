import { AnswerItem } from '@/interfaces/database/chat';
import { useMemo } from 'react';

interface CompletionState {
  isCompleted: boolean;
  completionTime?: number;
}

/**
 * Hook to detect if deepinsight stream has completed
 *
 * For deepinsightChat (streaming):
 * - Detects process=='think' && type=='thinking_step_report_generating' && percentage==100
 *
 * For deepinsightConferenceQuestion (streaming):
 * - Detects process=='progress' && type=='content_markdown' && percentage==100
 *
 * For deepinsightConferenceQuestion (full conversation data):
 * - Checks if any item has percentage==100 (indicates completion)
 * - Falls back to checking if last content item has percentage==100
 */
export function useDeepinsightCompletion(
  answerData: AnswerItem[] | undefined,
  mode: 'chat' | 'conference' | null,
): CompletionState {
  return useMemo(() => {
    if (!answerData || !Array.isArray(answerData) || mode === null) {
      return { isCompleted: false };
    }

    let completionItem: AnswerItem | undefined;

    if (mode === 'chat') {
      // For deepinsightChat: find item with process=='think' && type=='thinking_step_report_generating' && percentage==100
      completionItem = answerData.find(
        (item) =>
          item?.process === 'think' &&
          item?.type === 'thinking_step_report_generating' &&
          item?.percentage === 100,
      );
    } else if (mode === 'conference') {
      // For deepinsightConferenceQuestion: find item with process=='progress' && type=='content_markdown' && percentage==100
      // This handles both streaming and complete conversation data
      completionItem = answerData.find(
        (item) =>
          item?.process === 'progress' &&
          item?.type === 'content_markdown' &&
          item?.percentage === 100,
      );

      // If not found in progress/content_markdown, check for any item with percentage==100
      // This handles complete conversation data that may have different process types
      if (!completionItem) {
        completionItem = answerData.find((item) => item?.percentage === 100);
      }

      // If still not found, check if the last item has percentage==100
      // This ensures we detect completion from full conversation data
      if (!completionItem && answerData.length > 0) {
        const lastItem = answerData[answerData.length - 1];
        if (lastItem?.percentage === 100) {
          completionItem = lastItem;
        }
      }
    }

    return {
      isCompleted: !!completionItem,
      completionTime: completionItem?.create_time,
    };
  }, [answerData, mode]);
}
