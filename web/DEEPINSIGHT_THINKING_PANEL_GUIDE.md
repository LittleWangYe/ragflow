# DeepInsight 思考面板集成指南

## 功能概述

当使用 `deepinsightChat` 聊天类型时，右侧会显示一个专用的思考面板，用于展示 AI 的思考过程和生成的报告。

## 数据结构

### 流式数据示例

```json
{
  "code": 0,
  "message": "",
  "data": {
    "answer": [
      {
        "content": "正在研究中",
        "create_time": 1760579832.3801107,
        "process": "",
        "type": "content_markdown"
      },
      {
        "content": "生成报告大纲",
        "create_time": 1760579832.380178,
        "message_id": "791b4bb3-af07-4d2e-a142-4619610aea93",
        "percentage": 100,
        "process": "think",
        "type": "thinking_step_outline"
      },
      {
        "content": "# 报告大纲\n## 1. 摘要\n...",
        "create_time": 1760579832.3801823,
        "message_id": "run--9c48e423-ea51-4ecb-a9bf-eb698001efb5",
        "parent_message_id": "791b4bb3-af07-4d2e-a142-4619610aea93",
        "process": "think",
        "type": "content_markdown"
      }
    ]
  }
}
```

## 数据项属性说明

| 属性 | 说明 | 示例 |
|------|------|------|
| `type` | 内容类型 | `content_markdown`, `thinking_step_outline`, `thinking_step_topic` |
| `process` | 处理阶段 | `"think"` 表示思考过程, `""` 表示结果 |
| `content` | 实际内容 | Markdown 文本或纯文本 |
| `message_id` | 消息唯一标识 | UUID 字符串 |
| `parent_message_id` | 父消息ID | 用于构建层级关系 |
| `percentage` | 进度百分比 | 0-100 |
| `create_time` | 创建时间戳 | 毫秒级 |

## 面板布局

### 思考过程标签

显示多级别的思考过程树：

```
1级内容（如：生成报告大纲）
└── 进度条：100%
    └── 可展开显示2级内容
        ├── 2级内容项1（如：报告大纲详情）
        │   ├── 进度条（如有）
        │   └── 可展开显示3级内容
        │       ├── 3级内容项1
        │       ├── 3级内容项2
        │       └── ...
        ├── 2级内容项2
        └── ...
```

### 查看报告标签

显示最终生成的报告（通过 `type=result` 且 `process=""` 的项目）

## 使用流程

### 1. 后端返回 deepinsightChat 数据

确保响应包含 `answer` 数组，其中包含多个项目，按照上述数据结构组织。

### 2. 前端自动检测并显示

```typescript
// chat-container/index.tsx 会自动：
// 1. 检测响应数据中是否存在 answerArray
// 2. 若存在则激活 deepinsightChat 模式
// 3. 从左侧消息列表中分离出思考数据
// 4. 在右侧显示 DeepInsightThinkingPanel 组件
```

### 3. 用户交互

- **点击思考项目的标题**：展开/收起该项及其子项
- **切换标签**：在"思考过程"和"查看报告"之间切换
- **查看进度**：每个项目下方显示进度条，表示完成百分比

## 样式支持

面板支持浅色和暗黑主题，会自动适配系统主题设置。

### CSS 类名

| 类名 | 说明 |
|------|------|
| `.thinkingPanel` | 最外层容器 |
| `.panelHeader` | 标签栏和关闭按钮 |
| `.panelContent` | 内容区域 |
| `.thinkingContent` | 思考过程内容 |
| `.thinkingItem` | 1级思考项 |
| `.childrenContainer` | 2级项容器 |
| `.childItem` | 2级思考项 |
| `.grandchildrenContainer` | 3级项容器 |
| `.grandchildItem` | 3级思考项 |
| `.reportContent` | 报告内容区域 |

## 完整示例

### 组件使用

```tsx
import DeepInsightThinkingPanel from '@/components/deepinsight-thinking-panel';

// 在聊天容器中
{isDeepinsightChat && (
  <div className={styles.thinkingPanelWrapper}>
    <DeepInsightThinkingPanel
      data={thinkingData}
      loading={sendLoading}
    />
  </div>
)}
```

### 数据准备

```typescript
// 从最后一条消息中提取思考数据
const thinkingData = useMemo(() => {
  const lastMessage = derivedMessages?.[derivedMessages.length - 1];
  if (lastMessage?.role === MessageType.Assistant && lastMessage?.data?.answerArray) {
    return lastMessage.data.answerArray as AnswerItem[];
  }
  return [];
}, [derivedMessages]);

// 检测是否为 deepinsightChat 模式
const isDeepinsightChat = useMemo(() => {
  return thinkingData.length > 0;
}, [thinkingData]);
```

## 常见问题

### Q: 为什么思考面板没有显示？

**A:** 检查以下几点：
1. 后端是否返回了包含 `answer` 数组的响应
2. 响应数据中是否包含 `process: "think"` 的项
3. 检查浏览器控制台是否有错误信息

### Q: 如何自定义样式？

**A:** 修改 `deepinsight-thinking-panel.less` 文件中的相关 CSS 类。支持以下变量：
- `--bg-base`: 基础背景色
- `--bg-secondary`: 次级背景色
- `--text-primary`: 主文本色
- `--text-secondary`: 次级文本色
- `--border-color-base`: 边框色
- `--primary-color`: 主题色

### Q: 如何处理超长内容？

**A:** 内容区域设置了 `overflow-y: auto`，会自动显示滚动条。Markdown 内容会自动换行。

## 相关文件

- `/src/components/deepinsight-thinking-panel.tsx` - 面板组件
- `/src/components/deepinsight-thinking-panel.less` - 样式
- `/src/pages/chat/chat-container/index.tsx` - 集成容器
- `/src/pages/chat/chat-container/index.less` - 容器样式
- `/src/interfaces/database/chat.ts` - 数据接口定义

## 测试建议

1. **基础测试**：创建一个 deepinsightChat 类型的对话框，发送消息，验证是否显示思考面板
2. **数据完整性测试**：检查各级内容是否正确显示
3. **交互测试**：点击展开/收起按钮，切换标签，验证功能是否正常
4. **性能测试**：使用大量嵌套数据测试面板的性能
5. **主题测试**：切换浅色/暗黑主题，验证样式适配
