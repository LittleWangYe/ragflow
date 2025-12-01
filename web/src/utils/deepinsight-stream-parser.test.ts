/**
 * 测试 deepinsight-stream-parser 的工具调用穿插功能
 */

import { parseDeepinsightData } from './deepinsight-stream-parser';

describe('parseDeepinsightData - Tool Call Integration', () => {
  it('应该将工具调用穿插在答案中', () => {
    const testData = {
      answer: [
        {
          content: '开始搜索',
          type: 'content_markdown',
          process: '',
          create_time: 1000,
        },
        {
          content: JSON.stringify({
            name: 'search',
            id: 'call_123',
            args: { query: 'test' },
            result: [],
          }),
          type: 'content_tool_call',
          process: '',
          create_time: 1001,
        },
        {
          content: '搜索完成',
          type: 'content_markdown',
          process: '',
          create_time: 1002,
        },
      ],
    };

    const result = parseDeepinsightData(testData);

    console.log('Result answer:', result.answer);

    // 验证工具调用标记在答案中
    expect(result.answer).toContain('<tool-call>');
    expect(result.answer).toContain('</tool-call>');
    expect(result.answer).toContain('search');
    expect(result.answer).toContain('开始搜索');
    expect(result.answer).toContain('搜索完成');
  });

  it('工具调用应该按照顺序穿插', () => {
    const testData = {
      answer: [
        {
          content: '第一步',
          type: 'content_markdown',
          process: '',
          create_time: 1000,
        },
        {
          content: JSON.stringify({
            name: 'tool1',
            id: 'call_1',
            args: {},
            result: [],
          }),
          type: 'content_tool_call',
          process: '',
          create_time: 1001,
        },
        {
          content: '第二步',
          type: 'content_markdown',
          process: '',
          create_time: 1002,
        },
        {
          content: JSON.stringify({
            name: 'tool2',
            id: 'call_2',
            args: {},
            result: [],
          }),
          type: 'content_tool_call',
          process: '',
          create_time: 1003,
        },
        {
          content: '第三步',
          type: 'content_markdown',
          process: '',
          create_time: 1004,
        },
      ],
    };

    const result = parseDeepinsightData(testData);
    const answer = result.answer;

    console.log('Sequential result:', answer);

    // 验证顺序：第一步 -> tool1 -> 第二步 -> tool2 -> 第三步
    const firstToolPos = answer.indexOf('tool1');
    const secondToolPos = answer.indexOf('tool2');
    const firstStepPos = answer.indexOf('第一步');
    const secondStepPos = answer.indexOf('第二步');
    const thirdStepPos = answer.indexOf('第三步');

    expect(firstStepPos).toBeLessThan(firstToolPos);
    expect(firstToolPos).toBeLessThan(secondStepPos);
    expect(secondStepPos).toBeLessThan(secondToolPos);
    expect(secondToolPos).toBeLessThan(thirdStepPos);
  });
});
