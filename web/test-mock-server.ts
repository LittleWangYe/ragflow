/**
 * Mock 服务验证脚本
 * 用于验证 mock 服务是否正确设置和运行
 *
 * 用法: npx ts-node test-mock-server.ts
 */

import fetch from 'node-fetch';

const MOCK_SERVER_URL = 'http://localhost:3001';
const HEALTH_CHECK_URL = `${MOCK_SERVER_URL}/health`;
const CONFERENCE_QUESTION_URL = `${MOCK_SERVER_URL}/api/deepinsight/conference_question`;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function test1_HealthCheck() {
  try {
    const response = await fetch(HEALTH_CHECK_URL);
    const data = (await response.json()) as any;

    if (response.status === 200 && data.status === 'ok') {
      results.push({
        name: 'Health Check',
        passed: true,
        message: '✅ Mock 服务正在运行',
        details: `Timestamp: ${data.timestamp}`,
      });
    } else {
      results.push({
        name: 'Health Check',
        passed: false,
        message: '❌ Mock 服务响应异常',
        details: `Status: ${response.status}`,
      });
    }
  } catch (error) {
    results.push({
      name: 'Health Check',
      passed: false,
      message: '❌ 无法连接到 Mock 服务',
      details: `Error: ${(error as Error).message}\n请确保 mock 服务运行在 ${MOCK_SERVER_URL}`,
    });
  }
}

async function test2_ConferenceQuestionEndpoint() {
  try {
    const response = await fetch(CONFERENCE_QUESTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: 'test_conv_123',
        messages: [
          {
            role: 'user',
            id: 'msg_test_1',
            content: 'Test question',
          },
        ],
      }),
    });

    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      results.push({
        name: 'Conference Question Endpoint',
        passed: true,
        message: '✅ 端点返回 SSE 流',
        details: 'Content-Type: text/event-stream',
      });

      // 尝试读取第一行数据
      if (response.ok) {
        const text = await response.text();
        const lines = text.split('\n').slice(0, 3);

        if (lines.some((line) => line.includes('data:'))) {
          results.push({
            name: 'SSE Data Format',
            passed: true,
            message: '✅ 数据格式正确',
            details: `First data line: ${lines[0].substring(0, 100)}...`,
          });
        } else {
          results.push({
            name: 'SSE Data Format',
            passed: false,
            message: '❌ 数据格式不正确',
            details: lines.join('\n'),
          });
        }
      }
    } else {
      results.push({
        name: 'Conference Question Endpoint',
        passed: false,
        message: '❌ 端点未返回 SSE 流',
        details: `Content-Type: ${response.headers.get('content-type')}`,
      });
    }
  } catch (error) {
    results.push({
      name: 'Conference Question Endpoint',
      passed: false,
      message: '❌ 请求失败',
      details: (error as Error).message,
    });
  }
}

async function test3_ResponseFileExistence() {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'response_confusionQuestion.txt');

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').length;

      results.push({
        name: 'Response File',
        passed: true,
        message: '✅ response_confusionQuestion.txt 文件存在',
        details: `Size: ${(stats.size / 1024).toFixed(2)} KB, Lines: ${lines}`,
      });
    } else {
      results.push({
        name: 'Response File',
        passed: false,
        message: '❌ response_confusionQuestion.txt 文件不存在',
        details: `Expected path: ${filePath}`,
      });
    }
  } catch (error) {
    results.push({
      name: 'Response File',
      passed: false,
      message: '❌ 无法检查文件',
      details: (error as Error).message,
    });
  }
}

async function printResults() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     DeepInsight Mock Server Test Results      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    console.log(`\n${result.message}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  });

  console.log(
    `\n\n════════════════════════════════════════════════\n` +
      `Results: ${passed}/${total} tests passed\n`,
  );

  if (passed === total) {
    console.log('🎉 所有测试都通过了！Mock 服务配置正确。\n');
    process.exit(0);
  } else {
    console.log('⚠️  有些测试失败，请检查上面的详情。\n');
    process.exit(1);
  }
}

async function runTests() {
  console.log('\n⏳ 开始运行测试...\n');

  await delay(500);
  await test1_HealthCheck();

  await delay(500);
  await test2_ConferenceQuestionEndpoint();

  await delay(500);
  await test3_ResponseFileExistence();

  await delay(500);
  await printResults();
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
