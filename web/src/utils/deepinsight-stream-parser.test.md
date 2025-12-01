# DeepInsight 流式数据解析说明

## 概述
deepinsightConferenceQuestion 接口返回的是流式数据，每个事件包含一个数据对象。该数据对象中的 `answer` 字段是一个数组，而不是简单的字符串。

## 数据格式

### 完整的 SSE 事件示例
```
data: {
  "code": 0,
  "message": "",
  "data": {
    "id": "msg_id",
    "session_id": "conv_id",
    "answer": [
      {
        "process": "think",
        "type": "content_markdown",
        "content": "JSON content or text",
        "message_id": "lc_run--xxx",
        "parent_message_id": null,
        "create_time": 1764235993.4505486
      },
      {
        "process": "progress",
        "type": "thinking_step_outline",
        "content": "正在生成大纲",
        "message_id": "lc_run--yyy",
        "parent_message_id": null,
        "create_time": 1764236010.753999,
        "percentage": 25
      },
      {
        "process": "",
        "type": "content_markdown",
        "content": "# 最终答案\n...",
        "message_id": "lc_run--zzz",
        "parent_message_id": null,
        "create_time": 1764236051.371681
      }
    ],
    "reference": { "chunks": [] },
    "created_at": 1764235991.846676,
    "updated_at": 1764236051.371681
  }
}
```

## 字段说明

### answer 数组中的每个元素
| 字段 | 类型 | 说明 |
|-----|------|------|
| process | string | `"think"`(思考) / `"progress"`(进度) / `""`(最终结果) |
| type | string | 内容类型，见下表 |
| content | string/object | 实际内容，可能是 JSON 字符串或纯文本 |
| message_id | string | 消息标识 |
| parent_message_id | string | 父消息标识 |
| create_time | number | 创建时间戳（秒） |
| percentage | number? | 进度百分比（0-100），仅在 process="progress" 时出现 |

### type 枚举值

#### 内容类型
- `content_markdown`: Markdown 格式内容（最终可展示）
- `content_tool_call`: 工具调用分段

#### 思考阶段类
- `thinking_step_outline`: 生成大纲阶段的思考步骤
- `thinking_step_topic`: 主题拆解阶段的思考步骤
- `thinking_step_report_generating`: 报告生成阶段的思考步骤

#### 专家评审类
- `expert_review_step_generating`: 专家评审阶段的进度说明
- `expert_review_chunk`: 专家评审输出的分片内容

#### 中断交互类
- `interrupt_clarification`: 澄清请求（需要用户补充信息）
- `interrupt_execute_plan_edit`: 执行计划可编辑
- `interrupt_report_outline_edit`: 报告大纲可编辑
- `interrupt`: 通用中断

## 解析逻辑

### parseDeepinsightData 函数处理流程

1. **检查数据有效性**
   - 若 data 不是对象，返回空 IAnswer

2. **遍历 answer 数组**
   - 每个元素根据 type 和 process 分类

3. **分类处理**
   - **进度类** (isProgressStep)
     - 包含 `thinking_step_*`, `expert_review_*` 且 process="progress"
     - 提取 percentage 作为进度百分比
     - 累积进度数据到 progressSteps 数组

   - **中断类** (isInterruptType)
     - type 以 `interrupt` 开头
     - 分别处理澄清、计划编辑、大纲编辑等
     - 格式化为引用块 (> **标题**)

   - **工具调用** (type="content_tool_call")
     - 内容通常是 JSON 对象
     - 尝试解析 JSON 并格式化显示

   - **Markdown 内容** (type="content_markdown")
     - process="think": 加入思考过程 (thinkingContent)
     - process="" 或 "answer": 加入主答案 (mainAnswer)

4. **构建最终答案**
   - 优先级：中断 > 正常答案
   - 思考过程用 `<think>` 标签包装
   - 最终答案直接展示

5. **返回 IAnswer 对象**
   - answer: 格式化后的最终文本
   - progressSteps: 进度步骤数组
   - progress: 最大进度百分比
   - 其他元数据

## 超时处理

### fetch 超时配置
- **标准 API** (completeConversation): 5 分钟超时
- **DeepInsight API** (deepinsightConferenceQuestion/deepinsightChat): 1 小时超时

```typescript
const timeoutMs = isDeepinsightApi ? 3600000 : 300000;
const timeoutId = setTimeout(() => abortController?.abort(), timeoutMs);
```

### 错误处理
- 超时会触发 AbortError
- 错误被捕获并记录，不会中断用户交互
- 用户可以通过 stopOutputMessage 手动中止请求

## 显示组件

### ProgressDisplay 组件
- 显示进度条（百分比）
- 显示当前步骤描述
- 显示已耗时

### MessageItem 组件
- 若 progress > 0，显示 ProgressDisplay
- 显示 think 标签内的思考过程（可折叠）
- 显示最终答案

## 数据流

```
SSE Event (streaming)
    ↓
parseDeepinsightData()
    ↓
分离: 思考/答案/进度/中断
    ↓
setAnswer(parsedAnswer)
    ↓
MessageItem 渲染
    ├─ ProgressDisplay (if progress > 0)
    └─ MarkdownContent (final answer)
```

## 常见场景

### 场景 1: 长时间思考过程
```
answer: [
  { process: "think", type: "content_markdown", content: "分析中..." },
  { process: "progress", type: "thinking_step_outline", content: "生成大纲", percentage: 25 },
  { process: "progress", type: "thinking_step_topic", content: "拆解主题", percentage: 50 },
  { process: "", type: "content_markdown", content: "# 最终答案" }
]
```
→ 显示进度条 → 显示完整思考过程 → 显示最终答案

### 场景 2: 中断澄清
```
answer: [
  { type: "interrupt_clarification", content: "请说明具体时间范围" }
]
```
→ 显示澄清提示，暂停流，等待用户输入

### 场景 3: 工具调用
```
answer: [
  { process: "think", type: "content_tool_call", content: { id: "call_01", name: "search", args: {...} } }
]
```
→ 格式化显示工具调用过程

## 配置项

### 环境变量
无需特殊配置，超时时间固定在代码中。

### 依赖
- `react`: 状态管理
- `antd`: UI 组件（Progress）
- `react-markdown`: Markdown 渲染
- `lodash`: 工具函数
