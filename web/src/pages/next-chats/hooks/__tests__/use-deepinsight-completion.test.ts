import { AnswerItem } from '@/interfaces/database/chat';
import { renderHook } from '@testing-library/react';
import { useDeepinsightCompletion } from '../use-deepinsight-completion';

describe('useDeepinsightCompletion', () => {
  describe('Conference mode with complete conversation data', () => {
    it('should detect completion from percentage==100 in complete conversation data', () => {
      const completionData: AnswerItem[] = [
        {
          type: 'thinking_step_topic',
          process: '',
          content: 'Topic 1',
          percentage: 0,
        },
        {
          type: 'content_markdown',
          process: 'progress',
          content: 'Content',
          percentage: 100,
          create_time: '2024-01-01T00:00:00Z',
        },
      ];

      const { result } = renderHook(() =>
        useDeepinsightCompletion(completionData, 'conference'),
      );

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.completionTime).toBe('2024-01-01T00:00:00Z');
    });

    it('should fallback to any item with percentage==100 if primary pattern not found', () => {
      const completionData: AnswerItem[] = [
        {
          type: 'thinking_step_topic',
          process: '',
          content: 'Topic 1',
          percentage: 0,
        },
        {
          type: 'some_other_type',
          process: 'some_other_process',
          content: 'Content',
          percentage: 100,
          create_time: '2024-01-01T00:00:00Z',
        },
      ];

      const { result } = renderHook(() =>
        useDeepinsightCompletion(completionData, 'conference'),
      );

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.completionTime).toBe('2024-01-01T00:00:00Z');
    });

    it('should detect completion from last item with percentage==100', () => {
      const completionData: AnswerItem[] = [
        {
          type: 'thinking_step_topic',
          process: '',
          content: 'Topic 1',
          percentage: 50,
        },
        {
          type: 'content_markdown',
          process: 'some_process',
          content: 'Content',
          percentage: 100,
          create_time: '2024-01-01T12:00:00Z',
        },
      ];

      const { result } = renderHook(() =>
        useDeepinsightCompletion(completionData, 'conference'),
      );

      expect(result.current.isCompleted).toBe(true);
    });

    it('should return false when no item has percentage==100', () => {
      const completionData: AnswerItem[] = [
        {
          type: 'thinking_step_topic',
          process: '',
          content: 'Topic 1',
          percentage: 50,
        },
        {
          type: 'content_markdown',
          process: 'progress',
          content: 'Content',
          percentage: 75,
        },
      ];

      const { result } = renderHook(() =>
        useDeepinsightCompletion(completionData, 'conference'),
      );

      expect(result.current.isCompleted).toBe(false);
    });
  });

  describe('Chat mode', () => {
    it('should detect completion from thinking_step_report_generating with percentage==100', () => {
      const completionData: AnswerItem[] = [
        {
          type: 'thinking_step_outline',
          process: 'think',
          content: 'Outline',
          percentage: 50,
        },
        {
          type: 'thinking_step_report_generating',
          process: 'think',
          content: 'Report',
          percentage: 100,
          create_time: '2024-01-01T00:00:00Z',
        },
      ];

      const { result } = renderHook(() =>
        useDeepinsightCompletion(completionData, 'chat'),
      );

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.completionTime).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('Edge cases', () => {
    it('should return false for undefined answerData', () => {
      const { result } = renderHook(() =>
        useDeepinsightCompletion(undefined, 'conference'),
      );

      expect(result.current.isCompleted).toBe(false);
    });

    it('should return false for null mode', () => {
      const completionData: AnswerItem[] = [
        {
          type: 'content_markdown',
          process: 'progress',
          content: 'Content',
          percentage: 100,
        },
      ];

      const { result } = renderHook(() =>
        useDeepinsightCompletion(completionData, null),
      );

      expect(result.current.isCompleted).toBe(false);
    });

    it('should return false for empty array', () => {
      const { result } = renderHook(() =>
        useDeepinsightCompletion([], 'conference'),
      );

      expect(result.current.isCompleted).toBe(false);
    });
  });
});
