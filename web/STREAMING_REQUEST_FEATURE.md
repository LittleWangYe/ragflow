# 实现导航栏按钮切换流式数据检查功能

## 需求描述
在登录后单击导航栏按钮切换时，判断当前页面是否在请求流式数据。如果在请求流式数据，则显示提示"当前正在获取会话内容,请停止或者等待会话完成后再试"，不让用户切换。

## 实现方案

### 1. 创建全局流式请求状态 Context
**文件**: `/src/contexts/streaming-request-context.tsx`

创建了一个 React Context 来管理全局的流式请求状态（`isStreaming`），任何组件都可以通过 `useStreamingRequest` Hook 来访问和修改这个状态。

```typescript
export const useStreamingRequest = () => {
  const context = useContext(StreamingRequestContext);
  if (context === undefined) {
    throw new Error('useStreamingRequest must be used within StreamingRequestProvider');
  }
  return context;
};
```

### 2. 在根应用中添加 Provider
**文件**: `/src/app.tsx`

在 `RootProvider` 中添加了 `StreamingRequestProvider`，使得整个应用都可以使用流式请求状态。

```typescript
<StreamingRequestProvider>
  <Root>{children}</Root>
</StreamingRequestProvider>
```

### 3. 在导航栏中添加检查逻辑
**文件**: `/src/layouts/next-header.tsx`

修改了 `handleChange` 函数，在用户点击导航菜单时检查是否正在进行流式请求：

```typescript
const handleChange = (path: SegmentedValue) => {
  const pathStr = path as string;
  // 防止重复导航到同一路径
  if (currentFullPath === pathStr) {
    return;
  }

  // 检查是否正在请求流式数据
  if (isStreaming) {
    message.warning(t('message.waitForStreamComplete') || '当前正在获取会话内容,请停止或者等待会话完成后再试');
    return;
  }

  // 启动导航锁定，禁用菜单点击直到页面加载完成
  startNavigation(pathStr);

  // 执行导航
  navigate(pathStr);
};
```

### 4. 在聊天相关页面同步流式请求状态
在以下页面的聊天组件中添加了 Effect Hook，将 `sendLoading` 状态同步到全局 Context：

**文件**: 
- `/src/pages/chat/chat-container/index.tsx`
- `/src/pages/next-chats/chat/chat-box/single-chat-box.tsx`
- `/src/pages/agent/chat/box.tsx`

示例代码：
```typescript
const { setIsStreaming } = useStreamingRequest();

// 将 sendLoading 状态同步到全局 Context
useEffect(() => {
  setIsStreaming(sendLoading);
}, [sendLoading, setIsStreaming]);
```

### 5. 添加本地化字符串
**文件**: 
- `/src/locales/zh.ts` - 中文提示
- `/src/locales/en.ts` - 英文提示

添加的提示信息：
- 中文: "当前正在获取会话内容,请停止或者等待会话完成后再试"
- 英文: "Currently fetching session content. Please stop or wait for the session to complete before trying again."

## 工作流程

1. 用户在聊天页面发送消息
2. `sendLoading` 状态变为 `true`
3. `ChatContainer` / `SingleChatBox` / `AgentChatBox` 组件中的 Effect Hook 检测到变化
4. 状态同步到全局 Context 的 `isStreaming`
5. 当用户尝试点击导航栏按钮时，`Header` 组件的 `handleChange` 函数检查 `isStreaming` 状态
6. 如果为 `true`，显示警告提示，阻止导航
7. 当消息发送完成，`sendLoading` 变为 `false`
8. 状态同步到全局 Context，用户可以正常切换页面

## 技术栈
- React Context API - 管理全局状态
- Hooks - useEffect, useContext 等
- Ant Design - message 组件显示提示
- i18n - 国际化支持

## 后续可改进点
1. 可以添加一个"停止请求"按钮，让用户可以主动中止流式请求
2. 可以在导航锁定时禁用导航按钮的点击效果
3. 可以根据不同的页面类型有不同的流式请求状态（如果需要的话）
