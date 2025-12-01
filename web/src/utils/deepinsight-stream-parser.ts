/**
 * 处理 deepinsight 格式的流式数据
 * 该格式的特点是 data.answer 是一个数组，包含多个步骤的数据
 *
 * 数据格式说明：
 * - answer: 数组，每个元素包含 { process, type, content, message_id, parent_message_id, create_time, percentage? }
 * - process: "think" (思考), "progress" (进度), "" (最终结果)
 * - type: "content_markdown", "content_tool_call", "thinking_step_*", "expert_review_*", "interrupt*"
 *
 * 显示结构：
 * 1. 思考过程（process="think"）- 用 <think> 标签包裹
 * 2. 进度条（process="progress"）- 显示进度百分比 + content
 * 3. 正文内容（process=""，type="result" 或其他）
 * 4. 总耗时信息
 */

import { AnswerItem, IAnswer, ProgressStep } from '@/interfaces/database/chat';

/**
 * 判断是否为中断交互类型
 */
function isInterruptType(item: AnswerItem): boolean {
  return item.type?.startsWith('interrupt');
}

/**
 * 尝试解析 JSON 字符串内容（某些 content 可能是 JSON 格式）
 */
function tryParseJsonContent(content: any): string {
  if (typeof content === 'string') {
    try {
      // 尝试解析为 JSON，如果是 JSON 对象则转为字符串
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed, null, 2);
      }
      return String(parsed);
    } catch {
      // 如果解析失败，直接返回原字符串
      return content;
    }
  }
  return String(content || '');
}

/**
 * 将 deepinsight 格式的数据转换为 IAnswer 格式
 * 按照以下显示优先级组织内容：
 * 1. 思考过程（process="think"）- 用 <think> 标签包裹
 * 2. 进度条（process="progress"）- 显示百分比和进度内容
 * 3. 正文内容（process="" 或 type="result"）
 * 4. 总耗时信息
 *
 * @param data - 原始的 deepinsight 数据
 * @param conversationId - 会话 ID
 * @param chatBoxId - 聊天框 ID
 * @returns 转换后的 IAnswer
 */
export function parseDeepinsightData(
  data: any,
  conversationId?: string,
  chatBoxId?: string,
): IAnswer {
  if (!data || typeof data !== 'object') {
    return { answer: '', conversationId, chatBoxId } as IAnswer;
  }

  const answerArray = data.answer as AnswerItem[] | undefined;
  let thinkingContent = '';
  let mainAnswer = '';
  let clarificationContent = '';
  let planEditContent = '';
  let outlineEditContent = '';
  let interruptContent = '';
  const progressSteps: ProgressStep[] = [];
  let maxProgress = 0;
  let startTime: number | null = null;
  let endTime: number | null = null;

  if (Array.isArray(answerArray)) {
    // 遍历数组，分离不同类型的内容，按显示优先级组织
    const toolCallsList: any[] = []; // 单独保存工具调用列表

    answerArray.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }

      // 记录开始和结束时间以计算总耗时
      if (item.create_time) {
        if (!startTime) startTime = item.create_time;
        endTime = item.create_time;
      }

      // 思考过程（process="think"）- 包括思考内容和工具调用
      if (item.process === 'think') {
        if (item.type === 'content_tool_call') {
          // 工具调用在思考过程中
          try {
            let toolCallData = item.content;
            if (typeof toolCallData === 'string') {
              toolCallData = JSON.parse(toolCallData);
            }
            if (toolCallData && typeof toolCallData === 'object') {
              const toolCall = {
                name: toolCallData.name || '',
                id: toolCallData.id || '',
                args: toolCallData.args || {},
                result: toolCallData.result || [],
              };
              toolCallsList.push(toolCall);
              // 在思考内容中添加工具调用标记
              thinkingContent +=
                (thinkingContent ? '\n\n' : '') +
                '<tool-call>\n' +
                JSON.stringify(toolCall) +
                '\n</tool-call>';
            }
          } catch {
            // 忽略解析失败
          }
        } else {
          // 其他思考内容
          const content = tryParseJsonContent(item.content);
          thinkingContent += (thinkingContent ? '\n\n' : '') + content;
        }
        return;
      }

      // 进度信息（process="progress"）
      if (item.process === 'progress') {
        const percentage = item.percentage ?? 0;
        maxProgress = Math.max(maxProgress, percentage);

        progressSteps.push({
          type: item.type,
          content: tryParseJsonContent(item.content),
          percentage,
          create_time: item.create_time,
        });
        return;
      }

      // 中断交互（优先处理）
      if (isInterruptType(item)) {
        const content = tryParseJsonContent(item.content);

        if (item.type === 'interrupt_clarification') {
          clarificationContent +=
            (clarificationContent ? '\n\n' : '') + content;
        } else if (item.type === 'interrupt_execute_plan_edit') {
          planEditContent += (planEditContent ? '\n\n' : '') + content;
        } else if (item.type === 'interrupt_report_outline_edit') {
          outlineEditContent += (outlineEditContent ? '\n\n' : '') + content;
        } else if (item.type === 'interrupt') {
          interruptContent += (interruptContent ? '\n\n' : '') + content;
        }
        return;
      }

      // 正文内容（process="" 或空，type 为 content_markdown 或 result）
      if (item.process === '' || !item.process) {
        if (item.type === 'content_tool_call') {
          // 正文中的工具调用
          try {
            let toolCallData = item.content;
            if (typeof toolCallData === 'string') {
              toolCallData = JSON.parse(toolCallData);
            }
            if (toolCallData && typeof toolCallData === 'object') {
              const toolCall = {
                name: toolCallData.name || '',
                id: toolCallData.id || '',
                args: toolCallData.args || {},
                result: toolCallData.result || [],
              };
              toolCallsList.push(toolCall);
              // 在正文内容中添加工具调用标记
              mainAnswer +=
                (mainAnswer ? '\n\n' : '') +
                '<tool-call>\n' +
                JSON.stringify(toolCall) +
                '\n</tool-call>';
            }
          } catch {
            // 忽略解析失败
          }
          return;
        } else if (item.type === 'content_markdown' || item.type === 'result') {
          const content = tryParseJsonContent(item.content);
          mainAnswer += (mainAnswer ? '\n\n' : '') + content;
          return;
        }
      }

      // Markdown 内容（如果没有指定 process，也作为正文内容）
      if (item.type === 'content_markdown') {
        const content = tryParseJsonContent(item.content);
        // 只有在没有 process 或 process 为空时，才视为主答案
        if (!item.process || item.process === '') {
          mainAnswer += (mainAnswer ? '\n\n' : '') + content;
        } else if (item.process === 'think') {
          thinkingContent += (thinkingContent ? '\n\n' : '') + content;
        }
        return;
      }
    });
  }

  // 计算总耗时（秒为单位转毫秒）
  let elapsedMs = 0;
  if (startTime && endTime) {
    elapsedMs = Math.floor((endTime - startTime) * 1000);
  }

  // 构建最终答案
  let finalAnswer = '';

  // 优先级：中断交互 > 正常答案
  if (clarificationContent) {
    finalAnswer = `> **需要澄清**\n\n${clarificationContent}`;
  } else if (planEditContent) {
    finalAnswer = `> **执行计划（可编辑）**\n\n${planEditContent}`;
  } else if (outlineEditContent) {
    finalAnswer = `> **报告大纲（可编辑）**\n\n${outlineEditContent}`;
  } else if (interruptContent) {
    finalAnswer = `> **需要用户交互**\n\n${interruptContent}`;
  } else {
    // 按顺序组合：思考过程 → 正文 → 耗时
    // （进度由UI层在 markdown-content 中单独处理）

    // 1. 思考过程
    if (thinkingContent) {
      finalAnswer = `<think>${thinkingContent}</think>`;
    }

    // 2. 正文内容
    if (mainAnswer) {
      finalAnswer += (finalAnswer ? '\n\n' : '') + mainAnswer;
    }

    // 3. 总耗时信息（在正文最后）
    if (elapsedMs > 0 && mainAnswer) {
      const timeInfo = `⏱️ **总耗时**: ${formatElapsedTime(elapsedMs)}`;
      finalAnswer += '\n\n' + timeInfo;
    }
  }

  // 返回优化的对象，避免不必要的引用变化
  const result: IAnswer = {
    answer:
      finalAnswer ||
      (thinkingContent ? `<think>${thinkingContent}</think>` : ''),
    reference: data.reference,
    audio_binary: data.audio_binary,
    prompt: data.prompt,
    id: data.id,
    conversationId,
    chatBoxId,
    progress: maxProgress,
    elapsedTime: elapsedMs, // 添加总耗时
  };

  // 仅在有数据时添加这些字段
  if (progressSteps.length > 0) {
    result.progressSteps = progressSteps;
  }
  if (answerArray) {
    result.answerArray = answerArray;
  }
  if (thinkingContent) {
    result.thinkingContent = thinkingContent;
  }
  // 注意：toolCalls 现在已经通过 <tool-call> 标记穿插在答案中，
  // 同时也保存在 toolCallsList 中以供后续使用

  return result;
}

/**
 * 格式化耗时显示（毫秒转为易读格式）
 * @param elapsedMs - 已耗时（毫秒）
 * @returns 格式化字符串，如 "2m 34s"
 */
export function formatElapsedTime(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * 从答案数组中提取工具调用项
 * 处理实际接口返回的格式：data.answer 包含多个项，其中 type='content_tool_call' 的项包含工具调用数据
 * @param answerArray - 答案数组
 * @returns 工具调用对象数组
 */
export function extractToolCalls(answerArray: AnswerItem[]): any[] {
  if (!Array.isArray(answerArray)) return [];

  const toolCalls: any[] = [];

  answerArray.forEach((item) => {
    if (item && item.type === 'content_tool_call' && item.content) {
      try {
        // content 可能是对象或 JSON 字符串
        const toolCallData =
          typeof item.content === 'string'
            ? JSON.parse(item.content)
            : item.content;

        // 确保有必要的字段
        if (toolCallData && toolCallData.name) {
          toolCalls.push({
            name: toolCallData.name,
            id: toolCallData.id || '',
            index: toolCallData.index,
            args: toolCallData.args || {},
            result: toolCallData.result || [],
          });
        }
      } catch (error) {
        console.error('解析工具调用数据失败:', error, item.content);
      }
    }
  });

  return toolCalls;
}
