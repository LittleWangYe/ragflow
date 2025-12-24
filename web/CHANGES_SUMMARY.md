# 场景切换虚拟会话处理 - 修改总结

## 需求描述
在场景（deepinsightConferenceQuestion/ask/deepinsightChat）之间切换时，如果切换前的场景是一个新建的虚拟会话（用户没有发送内容，只存在于本地，`isNew=true`），那么应该记录的不是这个虚拟会话ID，而应该记录会话列表的第一条真实会话ID。

这样当再次切换回来时，应该打开第一条真实会话，而不是消失的虚拟会话。

## 修改文件列表

### 1. `/src/hooks/use-multi-scenario-route.ts`
**修改位置**: `saveCurrentScenarioState` 回调函数

**修改内容**:
- 函数签名从 `saveCurrentScenarioState = useCallback(() => { ... })` 改为 `saveCurrentScenarioState = useCallback((conversationList?: Array<{ id: string; is_new?: boolean }>) => { ... })`
- 增加了参数 `conversationList` 用于接收会话列表
- 在保存状态前，检查当前会话是否为虚拟会话（`isNew === 'true'`）
- 如果是虚拟会话，从会话列表中找到第一条真实会话（`is_new !== true`）并使用其ID替换
- 添加了调试日志，记录虚拟会话被替换的过程

**关键逻辑**:
```typescript
if (isNew === 'true' && conversationList && conversationList.length > 0) {
  const firstRealConversation = conversationList.find(
    (conv) => conv.is_new !== true,
  );
  if (firstRealConversation) {
    finalConversationId = firstRealConversation.id;
    finalIsNew = '';
    // ... 记录替换日志
  }
}
```

### 2. `/src/pages/next-chats/chat/chat-content.tsx`
**修改位置**: 导入和 useEffect

**修改内容**:
1. **导入新Hook**: 添加了 `useSelectDerivedConversationList` 导入
2. **获取会话列表**: 在组件中使用 `useSelectDerivedConversationList()` 获取 `conversationList`
3. **传入会话列表**: 修改 `saveCurrentScenarioState` 的调用，传入 `conversationList` 参数
4. **更新依赖数组**: 在 useEffect 的依赖数组中添加 `conversationList`

**修改前**:
```tsx
const { list: conversationList } = useSelectDerivedConversationList();
// ... later in useEffect
saveCurrentScenarioState();
```

**修改后**:
```tsx
const { list: conversationList } = useSelectDerivedConversationList();
// ... later in useEffect
saveCurrentScenarioState(conversationList);
```

## 工作流程

### 场景 1: 用户在 ask 场景创建虚拟会话，然后切换到 deepinsightChat
1. 用户点击"新建会话"按钮，创建虚拟会话（isNew=true）
2. 虚拟会话被添加到会话列表顶部，当前显示虚拟会话
3. 用户点击 deepinsightChat 场景（如"深度研究"菜单项）
4. 在切换前，`saveCurrentScenarioState` 被调用
5. **关键**: 检测到当前是虚拟会话（isNew='true'）
6. 从会话列表中找到第一条真实会话，保存其ID而不是虚拟会话ID
7. 切换到 deepinsightChat 场景

### 场景 2: 用户从 deepinsightChat 切换回 ask
1. `useMultiScenarioRoute` 检测到场景切换回 ask
2. 恢复之前保存的状态
3. **关键**: 恢复的是第一条真实会话的ID，而不是虚拟会话ID
4. 打开第一条真实会话，用户看到实际的会话内容，而不是消失的虚拟会话

## 调试信息

修改后会输出以下调试日志：

当检测到虚拟会话被替换时:
```
[useMultiScenarioRoute-ask] 🔄 Current is virtual session, replacing with first real conversation:
{
  originalId: "temp_1234567890", // 虚拟会话ID
  replacedId: "real_abcdef" // 真实会话ID
}
```

当保存状态时:
```
[useMultiScenarioRoute-ask] 💾 Saving state (only if conversationId is not empty):
{
  conversationId: "real_abcdef",
  isNew: "",
  conversationApi: ""
}
```

## 兼容性

- ✅ 不影响现有的场景切换逻辑
- ✅ 不影响真实会话的保存（非虚拟会话）
- ✅ 增强了虚拟会话的处理，避免切换回来后丢失会话

## 测试建议

1. 在任意场景创建新虚拟会话（不发送任何消息）
2. 切换到其他场景
3. 在浏览器控制台观察调试日志
4. 切换回原场景，验证打开的是第一条真实会话而非虚拟会话
5. 尝试在虚拟会话中发送消息后切换（这种情况下虚拟会话可能会被保存为真实会话，不需要替换）
