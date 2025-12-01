import { IAnswer } from '@/interfaces/database/chat';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * 用于展示 deepinsightConferenceQuestion 的进度和耗时
 * 仅用于在消息发送时实时显示，不应在消息列表中使用
 */
export const useProgressDisplay = (answer: IAnswer | undefined) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const startTimeRef = useRef<number | undefined>();
  const answerIdRef = useRef<string>('');

  // 检测是否为新答案（通过 id 判断）
  const isNewAnswer = useMemo(() => {
    if (!answer?.id) return false;
    if (answerIdRef.current !== answer.id) {
      answerIdRef.current = answer.id;
      startTimeRef.current = undefined; // 重置开始时间
      return true;
    }
    return false;
  }, [answer?.id]);

  useEffect(() => {
    // 初始化开始时间（仅初始化一次）
    if (
      startTimeRef.current === undefined &&
      answer?.progressSteps &&
      answer.progressSteps.length > 0
    ) {
      startTimeRef.current = Date.now();
    }

    // 更新耗时（定时更新）
    if (startTimeRef.current) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current!;
        setElapsedTime(elapsed);
      }, 1000); // 每 1s 更新一次（降低频率以减少渲染）

      return () => clearInterval(interval);
    }
  }, [answer?.progressSteps]); // 直接依赖 progressSteps（引用比较）

  return {
    elapsedTime,
    progress: answer?.progress || 0,
    progressSteps: answer?.progressSteps || [],
    isNewAnswer,
  };
};
