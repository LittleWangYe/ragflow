# DeepInsight 接口说明文档

- 面向前端开发，用于集成深度研究与顶会问答，以及报告导出。

## 概述
- 接口列表：
  - POST `/chat` — SSE 流式输出，深度研究场景
  - POST `/conference_question` — SSE 流式输出，顶会问答场景
  - POST `/pdf/generate` — 生成并下载会议洞察报告 PDF（二进制流）
  - POST `/ppt/generate` — 生成会议洞察 PPT，返回文件信息

## 鉴权
- 需要登录态。前端需在请求中携带登录凭证（Cookie 或 Token）。服务端装饰器 `login_required`。

## 通用约定
- Base URL：由后端部署地址决定。
- Content-Type：`application/json`。
- 返回统一包裹：`{ code, message, data }`。
- 成功：`code = 0`；错误：`code != 0`（例如 500）。

## 请求体公共说明

### 通用请求参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| conversation_id | string | 是 | 会话标识 |
| messages | Message[] | 是 | 消息数组。content 通常为纯文本字符串 |
| stream | boolean | 否 | 是否使用 SSE 流式输出，默认 true（非流式时返回一次性 JSON） |

### Message 结构（请求体）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| role | string | 是 | `user` | `assistant` | `system`（`system` 会被忽略） |
| id | string | 是 | 消息 ID（用于串流定位） |
| content | string | 是 | 纯文本内容（推荐）。复合分段仅在流式响应中出现 |

## 消息复合结构
- `content` 支持两类形式：
  - 普通文本：直接为字符串
  - 复合结构：为数组，数组元素为分段对象

- 分段对象通用字段：
  - `type`: 分段类型
  - `content`: 具体内容
  - 可选字段：`process`（如 `think` 表示思考过程，默认不对外展示）、`message_id`、`parent_message_id`、`create_time`

### process 与 type 说明
- `process`（三种取值）：
  - `think`：思考过程内容，通常不直接展示给用户，可折叠或过滤
  - `progress`：思考进度描述，用于展示当前阶段进度
  - 空字符串：最终非思考过程结果（正式内容）

- 辅助字段：
  - `message_id`：当前段落对应消息 ID
  - `parent_message_id`：父消息 ID（用于树形关系）
  - `percentage`：进度百分比，`0–100`
  - `create_time`：创建时间戳（秒）

- `type` 枚举与语义：
  - 内容渲染类：
    - `content_markdown`：Markdown 格式内容（最终可展示）
    - `content_tool_call`：工具调用分段，`content` 包含 `{ id, name, args, result }`
  - 思考阶段类（report_chunk）：
    - `thinking_step_outline`：生成大纲阶段的思考步骤
    - `thinking_step_topic`：主题拆解阶段的思考步骤
    - `thinking_step_report_generating`：报告生成阶段的思考步骤
  - 专家评审类（progress）：
    - `expert_review_step_generating`：专家评审阶段的进度说明
    - `expert_review_chunk`：专家评审输出的分片内容
  - 中断交互类：
    - `interrupt`：通用中断，需要用户交互
    - `interrupt_clarification`：澄清请求，需要用户补充信息
    - `interrupt_execute_plan_edit`：执行计划可编辑中断
    - `interrupt_report_outline_edit`：报告大纲可编辑中断

### 前端处理建议
- 当 `type` 为中断交互类时，暂停内容继续渲染并弹窗提示用户进行澄清或编辑，提交后继续流。
- 当 `type=content_markdown` 时按 Markdown 渲染为最终内容；普通文本可直接使用字符串形式。
- 当 `type=content_tool_call` 时可折叠显示工具调用详情（名称、参数、结果）。
- `thinking_step_*` 类分段通常不直接展示，可在“分析过程”区域折叠显示或忽略。

### 示例：进度事件
```
{
  "type": "thinking_step_report_generating",
  "process": "progress",
  "content": "正在生成报告正文（章节：技术趋势）",
  "percentage": 62,
  "message_id": "msg_1002",
  "parent_message_id": "msg_1001",
  "create_time": 1732095400.123
}
```

### 示例：中断澄清
```
{
  "type": "interrupt_clarification",
  "process": "think",
  "content": "请明确需要重点分析的会议子主题（例如：LLM 推理、视觉模型、优化）",
  "message_id": "msg_1003"
}
```

### 示例：最终 Markdown 内容
```
{
  "type": "content_markdown",
  "process": "",
  "content": "# 会议洞察\n本报告围绕 NeurIPS 2024 的主题与趋势...",
  "message_id": "msg_1004",
  "create_time": 1732095455.321
}
```

- 普通文本示例（字符串形式）：
```
{
  "role": "user",
  "id": "msg_1000",
  "content": "请总结 NeurIPS 2024 的技术趋势"
}
```

- 工具调用分段示例：
```
{
  "type": "content_tool_call",
  "process": "think",
  "content": {
    "id": "tool_001",
    "name": "tavily_search",
    "args": { "query": "NeurIPS 2024 keynotes" },
    "result": "...工具返回的摘要或数据..."
  }
}
```

- 复合 `messages` 项示例（两种分段混合）：
```
{
  "role": "user",
  "id": "msg_1001",
  "content": [
    { "type": "content_markdown", "process": "", "content": "请基于官方日程回答" },
    {
      "type": "content_tool_call",
      "process": "think",
      "content": {
        "id": "tool_001",
        "name": "tavily_search",
        "args": { "query": "NeurIPS 2024 schedule" },
        "result": "..."
      }
    }
  ]
}
```

- 行为说明：
  - `system` 角色消息将被忽略
  - 当 `content` 为数组时，服务会按内部策略处理并输出流式 `answer` 与 `reference`
  - 标记为 `process: "think"` 的分段通常不参与对外展示与后续生成（例如 PPT），前端不必发送或可显式标记

## SSE 事件格式（`/chat` 与 `/conference_question`）
- 响应头：
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- 每个事件以 `data:` 开头，事件之间以空行分隔。
- 正常事件：
```
data: {"code":0,"message":"","data":{...}}
```
- 结束事件：
```
data: {"code":0,"message":"","data":true}
```
- 错误事件：
```
data: {"code":500,"message":"错误信息","data":{"answer":"**ERROR**: 错误详情","reference":[]}}
```


### 答案数据结构 `data`
- 字段：
  - `id`: 当前回答对应的消息 ID
  - `session_id`: 会话 ID（同 `conversation_id`）
  - `answer`: 当前增量或阶段性答案文本
  - `created_at`、`updated_at`: 时间戳（秒）
  - `reference`: 引用信息对象：
    - `chunks`: 引用片段数组，每个元素包含：
      - `id`、`content`、`document_id`、`document_name`、`dataset_id`、`image_id`、`positions`
    - `doc_aggs`: 文档聚合信息（可能为空）

## 接口详情

### 1) 深度研究聊天
- 路径：`POST /chat`
- 功能：基于研究场景的流式回答

#### 请求参数（Body）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| conversation_id | string | 是 | 会话标识 |
| messages | Message[] | 是 | 消息数组；`content` 一般为纯文本字符串 |
| stream | boolean | 否 | 是否使用 SSE，默认 true |

#### 响应参数（SSE 单事件 `data`）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 当前回答对应的消息 ID |
| session_id | string | 是 | 会话 ID |
| answer | string | 是 | 当前增量或阶段性答案文本 |
| message | MessageSegment[] | 否 | 消息分段列表（文本/工具调用/进度/中断）；消息列表在 `message` 字段，不在 `reference` |
| reference | object | 否 | 引用信息对象，包含 `chunks` 和 `doc_aggs` |
| created_at | number | 否 | 创建时间戳（秒） |
| updated_at | number | 否 | 更新时间戳（秒） |
- 请求体示例：
```
{
  "conversation_id": "conv_123",
  "messages": [
    {"role":"user","id":"msg_1700000001","content":"请深入研究 NeurIPS 2024 的技术趋势"}
  ],
  "stream": true
}
```
- 返回：SSE。示例事件：
```
data: {"code":0,"message":"","data":{
  "id":"msg_1700000001",
  "session_id":"conv_123",
  "answer":"第一阶段：检索官方日程与主题...",
  "created_at":1732095400.123,
  "updated_at":1732095400.987,
  "reference":{
    "chunks":[
      {
        "id":"ck_001","content":"NeurIPS 2024 schedule ...",
        "document_id":42,"document_name":"schedule.md",
        "dataset_id":7,"image_id":null,"positions":[12,34]
      }
    ],
    "doc_aggs":[]
  }
}}
```
- 结束事件：`data: {"code":0,"message":"","data":true}`
- 非流式：当 `stream=false` 时，返回一次性 JSON：
```
{
  "code": 0,
  "message": "",
  "data": {
    "id":"msg_1700000001",
    "session_id":"conv_123",
    "answer":"最终汇总回答...",
    "created_at":1732095400.123,
    "updated_at":1732095455.321,
    "reference": { "chunks": [...], "doc_aggs": [] }
  }
}
```


### 2) 顶会问答
- 路径：`POST /conference_question`
- 功能：会议场景问答，流式输出，数据结构与 `/chat` 相同

#### 请求参数（Body）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| conversation_id | string | 是 | 会话标识 |
| messages | Message[] | 是 | 消息数组；`content` 一般为纯文本字符串 |
| stream | boolean | 否 | 是否使用 SSE，默认 true |

#### 响应参数（SSE 单事件 `data`）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | string | 是 | 当前回答对应的消息 ID |
| session_id | string | 是 | 会话 ID |
| answer | string | 是 | 当前增量或阶段性答案文本 |
| message | MessageSegment[] | 否 | 消息分段列表（文本/工具调用/进度/中断）；消息列表在 `message` 字段，不在 `reference` |
| reference | object | 否 | 引用信息对象，包含 `chunks` 和 `doc_aggs` |
| created_at | number | 否 | 创建时间戳（秒） |
| updated_at | number | 否 | 更新时间戳（秒） |
- 请求体示例：
```
{
  "conversation_id": "conv_456",
  "messages": [
    {"role":"user","id":"msg_1700000100","content":"CVPR 2024 keynote 主要看点？"}
  ],
  "stream": true
}
```
- 返回：SSE，结束事件与错误处理一致


### 3) 生成 PDF 报告
- 路径：`POST /pdf/generate`
- 功能：将会话生成的 Markdown 合并并转为 PDF，直接返回二进制流（下载）

#### 请求参数（Body）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| conversation_id | string | 是 | 会话标识 |

#### 响应参数（Headers + Body）

| 项 | 值/类型 | 说明 |
| --- | --- | --- |
| Content-Disposition | `attachment; filename="报告名.pdf"` | 文件名（按响应头为准） |
| Content-Type | `application/octet-stream` | 二进制流类型 |
| Body | 二进制 | PDF 文件内容（支持流式下载） |
- 请求体：
```
{
  "conversation_id": "conv_456"
}
```
- 返回：
  - Headers：
    - `Content-Disposition: attachment; filename="报告名.pdf"`
    - `Content-Type: application/octet-stream`
    - `mimetype: text/pdf; charset=utf-8`
  - Body：PDF 二进制内容（支持流式下载）
- cURL：
```
curl -X POST \
  "${BASE_URL}/pdf/generate" \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"conv_456"}' \
  --output "会议洞察报告.pdf"
```


### 4) 生成 PPT
- 路径：`POST /ppt/generate`
- 功能：根据会话生成 PPT 并保存到用户文件系统；返回生成的文件结构，前端可据此调用文件下载接口获取文件

#### 请求参数（Body）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| conversation_id | string | 是 | 会话标识 |
| message | object | 是 | 触发生成的消息对象：`{ id: string, content: string }`（content 为文本） |

#### 响应参数（JSON）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| code | number | 是 | 0 表示成功 |
| message | string | 否 | 错误或提示信息 |
| data | FileObject | 是 | 生成的文件对象 |

FileObject 结构：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 文件 ID |
| parent_id | string | 父文件夹 ID |
| tenant_id | string | 租户/用户 ID |
| created_by | string | 创建人 ID |
| type | string | 文件类型（如 `pptx`） |
| name | string | 文件名 |
| location | string | 存储位置标识 |
| size | number | 文件大小（字节） |
- 请求体：
```
{
  "conversation_id": "conv_789",
  "message": {
    "id": "msg_1700000200",
    "content": "请生成会议洞察 PPT"
  }
}
```
- 返回：`{ code, message, data }`，其中 `data` 为文件对象（示例）：
```
{
  "id": "file_abc123",
  "parent_id": "folder_root",
  "tenant_id": "user_001",
  "created_by": "user_001",
  "type": "pptx",
  "name": "NeurIPS 2024 洞察.pptx",
  "location": "conv_789_msg_1700000200_NeurIPS 2024 洞察.pptx",
  "size": 1048576
}
```
- 下载：拿到 `id` 后，调用文件管理接口进行下载（例如 `GET /file/{id}`，以项目实际路由为准）


## 消息格式补充
- 预处理逻辑：
  - 忽略 `system` 角色；首条为 `assistant` 且无历史 `user` 时跳过
  - 引用结构标准化（不同来源字段归一）

## SSE 客户端示例（浏览器）
```
const controller = new AbortController();

fetch(`${BASE_URL}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversation_id: 'conv_123',
    messages: [{ role: 'user', id: 'msg_1', content: '...' }],
    stream: true
  }),
  signal: controller.signal
}).then(async (res) => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const evt of events) {
      if (!evt.startsWith('data:')) continue;
      const json = JSON.parse(evt.slice(5));
      if (json.code !== 0) {
        // 错误处理
        continue;
      }
      if (json.data === true) {
        // 结束
        controller.abort();
        break;
      }
      // 渲染 json.data.answer
    }
  }
});
```

## 注意事项
- SSE 连接需保持 `keep-alive`（响应头已设置）。
- 前端应对断线重连与重复事件做幂等处理。
- 下载 PDF 时优先使用响应头中的 `filename`。
- PPT 生成可能耗时，建议在界面显示生成进度或等待提示。

## 数据结构说明（流式 `data.message`）

### 分段对象通用字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | string | 是 | 分段类型（见下表） |
| content | any | 是 | 具体内容；Markdown 文本或工具调用结果等 |
| process | string | 否 | `think` | `progress` | `""`（最终结果） |
| message_id | string | 否 | 当前分段的消息 ID |
| parent_message_id | string | 否 | 父消息 ID（树形关系） |
| percentage | number | 否 | 0–100 的进度百分比（配合 `process=progress`） |
| create_time | number | 否 | 创建时间戳（秒） |

### type 枚举与语义

| 类别 | type 值 | 说明 |
| --- | --- | --- |
| 内容渲染 | `content_markdown` | Markdown 格式内容（最终可展示） |
| 内容渲染 | `content_tool_call` | 工具调用分段；`content={ id, name, args, result }` |
| 思考阶段（report_chunk） | `thinking_step_outline` | 生成大纲阶段的思考步骤 |
| 思考阶段（report_chunk） | `thinking_step_topic` | 主题拆解阶段的思考步骤 |
| 思考阶段（report_chunk） | `thinking_step_report_generating` | 报告生成阶段的思考步骤 |
| 进度阶段（progress） | `expert_review_step_generating` | 专家评审阶段的进度说明 |
| 进度阶段（progress） | `expert_review_chunk` | 专家评审输出的分片内容 |
| 中断交互 | `interrupt` | 通用中断，需要用户交互 |
| 中断交互 | `interrupt_clarification` | 澄清请求，需要用户补充信息 |
| 中断交互 | `interrupt_execute_plan_edit` | 执行计划可编辑中断 |
| 中断交互 | `interrupt_report_outline_edit` | 报告大纲可编辑中断 |

### 重要说明
- 请求体中的 `messages[*].content` 一般为纯文本字符串。
- 流式响应的 `data.message` 才是“消息分段列表”（文本/工具调用/进度/中断等），不在 `reference` 字段中。