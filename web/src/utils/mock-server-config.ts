/**
 * Mock API 配置
 * 用于本地开发和测试，指向本地 mock 服务
 *
 * 使用方法：
 * 1. npm run mock-server (启动 mock 服务，监听 3001 端口)
 * 2. 将 API 基础 URL 指向 http://localhost:3001
 * 3. 调用 deepinsightConferenceQuestion 接口时会流式返回 response_confusionQuestion.txt 内容
 */

export const MOCK_SERVER_CONFIG = {
  // Mock 服务地址
  baseURL: 'http://localhost:3001',

  // 是否启用 mock（本地开发时设为 true）
  enabled: process.env.USE_MOCK_SERVER === 'true',

  // 各接口端点
  endpoints: {
    // DeepInsight API - 顶会问答（会读取 response_confusionQuestion.txt 文件）
    deepinsightConferenceQuestion: '/api/deepinsight/conference_question',

    // DeepInsight API - 深度研究
    deepinsightChat: '/api/deepinsight/chat',

    // 标准对话 API
    completeConversation: '/api/conversation/complete',
  },

  // 健康检查
  healthCheck: '/health',
};

/**
 * 判断是否使用 mock 服务
 */
export function useMockServer(): boolean {
  return MOCK_SERVER_CONFIG.enabled;
}

/**
 * 获取 API 基础 URL
 */
export function getApiBaseURL(): string {
  return MOCK_SERVER_CONFIG.baseURL;
}

/**
 * 获取完整的 API URL
 */
export function getFullApiURL(
  endpoint: keyof typeof MOCK_SERVER_CONFIG.endpoints,
): string {
  return `${MOCK_SERVER_CONFIG.baseURL}${MOCK_SERVER_CONFIG.endpoints[endpoint]}`;
}
