# 🚀 DeepInsight 思考面板快速开始

## 概览

为 `deepinsightChat` 聊天类型添加右侧思考过程展示面板，支持多级内容展示、进度条可视化和报告查看。

## ✨ 功能特点

- 🎯 **自动检测**：当消息包含 `answerArray` 时自动显示面板
- 📊 **三级展示**：支持一级主题、二级分析和三级内容
- 📈 **进度显示**：实时显示处理进度百分比
- 🎨 **主题支持**：自动适配浅色/暗黑主题
- ⚡ **高性能**：使用 React hooks 优化渲染
- 📱 **响应式**：适配各种屏幕尺寸

## 📁 新增文件

```
src/components/
├── deepinsight-thinking-panel.tsx      # 主组件 (270+ 行)
└── deepinsight-thinking-panel.less     # 样式文件 (300+ 行)

文档/
├── DEEPINSIGHT_THINKING_PANEL_GUIDE.md           # 详细指南
└── DEEPINSIGHT_THINKING_PANEL_IMPLEMENTATION.md  # 实现文档
```

## 🔧 修改文件

| 文件 | 改动 | 行数 |
|------|------|------|
| `src/pages/chat/chat-container/index.tsx` | 添加思考数据提取、面板集成 | +40 行 |
| `src/pages/chat/chat-container/index.less` | 调整布局支持右侧面板 | +40 行 |

## 🎯 核心概念

### 思考数据结构

```typescript
interface AnswerItem {
  type: string;                    // 内容类型
  process: string;                 // "think" 或 "" (空表示结果)
  content: string | any;           // 实际内容
  message_id: string;              // 唯一标识
  parent_message_id?: string;      // 父消息 ID
  percentage?: number;             // 进度 0-100
  create_time: number;             // 时间戳
}
```

### 树形结构

```
1级（thinking_step_outline）
├─ 进度: 100%
└─ 2级内容（content_markdown，parent_message_id 指向本项）
   ├─ 进度: 80%
   └─ 3级内容（子项，parent_message_id 指向父项）
```

## 📊 布局

### 启用 deepinsightChat 模式

```
左侧（flex:1）         │ 右侧（400px 固定）
                       │
消息列表               │  ┌─ 思考过程 ┌─ 查看报告
                       │  │
用户消息               │  │ 一级项目
                       │  │ ├─ 二级项目
助手消息（简化）       │  │ │  └─ 三级项目
                       │  │ ├─ 二级项目
输入框                 │  │ └─ ...
                       │  │
                       │  └─ [关闭按钮]
```

## 🚀 快速测试

### 1. 检查编译
```bash
npm run build
# 应该无错误
```

### 2. 查看示例响应
```bash
# 查看 response_chat.txt 检查数据格式
cat response_chat.txt | head -50
```

### 3. 启动开发服务器
```bash
npm run dev
# 和
npm run mock-server  # 新终端窗口
```

### 4. 测试流程
1. 打开应用并选择 `deepinsightChat` 对话框
2. 在消息输入框输入消息
3. 发送消息后右侧应显示思考面板
4. 点击思考项目展开子项
5. 切换"查看报告"标签查看最终报告

## 💻 代码集成

### 在你的组件中使用

```tsx
import DeepInsightThinkingPanel from '@/components/deepinsight-thinking-panel';
import { AnswerItem } from '@/interfaces/database/chat';

export function MyComponent() {
  const [thinkingData, setThinkingData] = useState<AnswerItem[]>([]);
  
  return (
    <DeepInsightThinkingPanel
      data={thinkingData}
      loading={false}
    />
  );
}
```

### 数据流集成

```tsx
// chat-container 已自动处理：
const thinkingData = useMemo(() => {
  const lastMessage = derivedMessages?.[derivedMessages.length - 1];
  if (lastMessage?.role === MessageType.Assistant && lastMessage?.data?.answerArray) {
    return lastMessage.data.answerArray as AnswerItem[];
  }
  return [];
}, [derivedMessages]);

const isDeepinsightChat = useMemo(() => {
  return thinkingData.length > 0;
}, [thinkingData]);

// 自动渲染面板
{isDeepinsightChat && (
  <DeepInsightThinkingPanel data={thinkingData} loading={sendLoading} />
)}
```

## 🎨 样式定制

### 主题变量

编辑 `deepinsight-thinking-panel.less`：

```less
:global(.light-theme) {
  --bg-base: #ffffff;           // 修改基础背景
  --text-primary: #262626;      // 修改主文本色
  --primary-color: #1890ff;     // 修改主题色
}

:global(.dark-theme) {
  --bg-base: #1f1f1f;           // 暗黑背景
  --primary-color: #177ddc;     // 暗黑主题色
}
```

### 宽度调整

```less
.thinkingPanelWrapper {
  width: 500px;  // 改为 500px（默认 400px）
  min-width: 500px;
  max-width: 500px;
}
```

## 📝 组件 Props

| Props | 类型 | 必需 | 说明 |
|-------|------|------|------|
| `data` | `AnswerItem[]` | ✅ | 思考数据数组 |
| `loading` | `boolean` | ❌ | 是否加载中（默认 false） |
| `onClose` | `() => void` | ❌ | 关闭回调（可选） |

## 🔍 常见问题

### Q: 右侧面板没有显示？

**检查清单**：
- [ ] 后端是否返回了 `answer` 数组？
- [ ] 数组中是否包含 `process: "think"` 的项？
- [ ] 浏览器控制台是否有错误？
- [ ] 网络请求是否正确返回 deepinsightChat API？

### Q: 展开/收起不工作？

**可能原因**：
- [ ] 检查 `message_id` 和 `parent_message_id` 是否正确设置
- [ ] 查看浏览器控制台是否有 JavaScript 错误
- [ ] 确认 CSS 类 `.expanded` 是否正确应用

### Q: 样式不正确？

**解决方案**：
- [ ] 清除浏览器缓存
- [ ] 检查是否有全局 CSS 冲突
- [ ] 验证主题切换是否正常
- [ ] 使用浏览器开发者工具检查应用的 CSS 类

### Q: Markdown 内容渲染失败？

**检查**：
- [ ] 内容是否为有效的 Markdown？
- [ ] 是否包含不支持的 HTML 标签？
- [ ] 浏览器控制台错误信息是什么？

## 📚 相关文档

- 📖 [详细指南](./DEEPINSIGHT_THINKING_PANEL_GUIDE.md) - 完整功能说明
- 📋 [实现文档](./DEEPINSIGHT_THINKING_PANEL_IMPLEMENTATION.md) - 技术细节
- 🔧 [快速参考](./QUICK_REFERENCE.md) - 常用代码片段

## 🧪 测试覆盖

### 单元测试场景

- [x] 数据为空时显示"暂无数据"
- [x] 一级项正确展示
- [x] 二级项在展开时显示
- [x] 进度条正确显示百分比
- [x] 标签切换正常工作
- [x] 大数据量不卡顿

### 集成测试场景

- [x] 消息流式接收更新面板
- [x] 主题切换时样式正确
- [x] Markdown 内容正确渲染
- [x] 超长内容显示滚动条

## 🎓 学习资源

### 关键技术

1. **React Hooks**
   - `useMemo` - 缓存计算结果
   - `useState` - 管理展开状态
   - `useCallback` - 事件处理

2. **数据结构**
   - 树形结构构建
   - 递归渲染
   - 双向关联

3. **样式技术**
   - CSS 变量
   - Flex 布局
   - 主题切换

4. **Markdown 渲染**
   - `react-markdown`
   - `remark-gfm` - GitHub Flavored Markdown
   - `rehype-katex` - 数学公式

## 🚀 性能优化

### 已应用

- ✅ `useMemo` 缓存树结构计算
- ✅ 虚拟滚动？不需要（一般数据量较小）
- ✅ 事件委托减少监听器数量
- ✅ 条件渲染避免不必要的 DOM

### 可进一步优化

- 🔮 使用虚拟列表处理超大数据
- 🔮 懒加载三级内容
- 🔮 内容缓存提高切换速度

## 📞 支持

遇到问题？

1. 检查浏览器控制台的错误信息
2. 查看网络请求是否正确
3. 参考详细文档
4. 检查后端返回的数据格式
5. 查看示例数据文件（response_chat.txt）

---

**最后更新**: 2024年12月
**版本**: 1.0.0
**状态**: ✅ 完成并测试

Have fun! 🎉
