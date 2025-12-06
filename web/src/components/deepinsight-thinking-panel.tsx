import ToolCallDisplay from '@/components/tool-call-display';
import { AnswerItem } from '@/interfaces/database/chat';
import { CheckOutlined, RightOutlined } from '@ant-design/icons';
import { Empty, Segmented, Spin } from 'antd';
import 'katex/dist/katex.min.css';
import { useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import styles from './deepinsight-thinking-panel.less';

interface ThinkingNode {
  item: AnswerItem;
  children: ThinkingNode[];
}

interface IProps {
  data: AnswerItem[];
  loading?: boolean;
  onClose?: () => void;
}

// Group only thinking_step_topic for collapsible header
const GROUP_TYPES = ['thinking_step_topic'];

// Map group type to display label (only for grouped types)
const GROUP_LABELS: Record<string, string> = {
  thinking_step_topic: '深度探索',
};

const DeepInsightThinkingPanel = ({ data = [], loading = false }: IProps) => {
  const [activeTab, setActiveTab] = useState<'thinking' | 'report'>('thinking');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedLevel2, setExpandedLevel2] = useState<Set<string>>(new Set());

  // 构建树形结构：根据 message_id 和 parent_message_id 建立关联
  const thinkingTree = useMemo(() => {
    const treeData: ThinkingNode[] = [];
    const itemMap: Record<string, ThinkingNode> = {};

    // group types that should be aggregated under one big title
    const groupTypes = GROUP_TYPES;

    // 首先筛选出 think 类型的项（用于构建子节点）
    const thinkItems = data.filter((item) => item.process === 'think');

    // 创建节点映射
    thinkItems.forEach((item) => {
      itemMap[item.message_id] = {
        item,
        children: [],
      };
    });

    // 建立父子关系（仅为普通 think 项）
    thinkItems.forEach((item) => {
      if (item.parent_message_id && itemMap[item.parent_message_id]) {
        itemMap[item.parent_message_id].children.push(itemMap[item.message_id]);
      }
    });

    // 先按类型收集所有项，便于分组展示
    const itemsByType: Record<string, AnswerItem[]> = {};
    thinkItems.forEach((it) => {
      if (!itemsByType[it.type]) itemsByType[it.type] = [];
      itemsByType[it.type].push(it);
    });

    // 按原始顺序遍历根节点（没有 parent_message_id），在首次遇到某个 groupType 根节点时插入该组（保持顺序）
    const addedGroup = new Set<string>();
    thinkItems.forEach((item) => {
      if (item.parent_message_id) return; // 仅看根节点位置

      if (groupTypes.includes(item.type)) {
        // 如果此类型的分组还没加入，则创建并插入分组节点
        if (!addedGroup.has(item.type)) {
          const itemsOfType = itemsByType[item.type] || [];
          const groupNode: ThinkingNode = {
            item: {
              message_id: `group-${item.type}`,
              type: item.type,
              content: GROUP_LABELS[item.type] || item.content,
              process: 'think',
              create_time: Date.now(),
            } as AnswerItem,
            children: itemsOfType.map(
              (it) => itemMap[it.message_id] || { item: it, children: [] },
            ),
          };
          treeData.push(groupNode);
          addedGroup.add(item.type);
        }
        // 如果已加入分组，则跳过单独插入此 root
      } else {
        // 普通根节点按原始顺序插入
        treeData.push(itemMap[item.message_id]);
      }
    });

    return treeData;
  }, [data]);

  // 提取报告内容（type 为 result）
  const reportContent = useMemo(() => {
    const reportItem = data.find((item) => item.type === 'result');
    return reportItem?.content || '';
  }, [data]);

  // 切换一级展开/收起
  const toggleExpand = (messageId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedItems(newExpanded);
  };

  // 切换二级展开/收起
  const toggleExpandLevel2 = (messageId: string) => {
    const newExpanded = new Set(expandedLevel2);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedLevel2(newExpanded);
  };

  // 获取二级标题
  const stripTrailingPercentage = (s: string) => {
    // remove trailing percentage like ' 50%' or '(50%)'
    return s.replace(/\s*\(?\d{1,3}%\)?\s*$/g, '').trim();
  };

  const getLevel2Title = (item: AnswerItem): string => {
    if (typeof item.content === 'string') {
      const firstLine = item.content.split('\n')[0] || '';
      return stripTrailingPercentage(firstLine);
    }
    return '';
  };

  const getLevel1Title = (item: AnswerItem): string => {
    // Prefer group label if present; otherwise use first line of content without trailing percentage
    if (GROUP_LABELS[item.type]) return GROUP_LABELS[item.type];
    if (typeof item.content === 'string') {
      const firstLine = item.content.split('\n')[0] || '';
      return stripTrailingPercentage(firstLine);
    }
    return '';
  };

  // 判断是否为简短的单行文本（不值得再下方重复显示）
  const isSimpleSingleLineContent = (item: AnswerItem): boolean => {
    if (typeof item.content !== 'string') return false;
    // 检查是否只有一行，且长度较短（< 100 字符）
    const lines = item.content.split('\n');
    return lines.length === 1 && item.content.length < 100;
  };

  // 获取三级标题和预览
  const getLevel3Display = (
    item: AnswerItem,
  ): { icon: string; text: string } => {
    if (item.type === 'content_tool_call') {
      try {
        const content =
          typeof item.content === 'string'
            ? JSON.parse(item.content)
            : item.content;
        const name = content?.name || '工具';
        return {
          icon: '🔧',
          text: `调用 ${name}`,
        };
      } catch {
        return {
          icon: '🔧',
          text: '工具调用',
        };
      }
    }
    // 其他类型：不加前缀圆点
    return {
      icon: '',
      text: item.content,
    };
  };

  // 渲染三级内容
  const renderLevel3Items = (children: ThinkingNode[]) => {
    return (
      <div className={styles.grandchildrenContainer}>
        {children.map((child) => {
          // 对 content_tool_call 使用现有的 ToolCallDisplay 组件
          if (child.item.type === 'content_tool_call') {
            let toolData: any = { name: '工具调用' };
            try {
              const parsed =
                typeof child.item.content === 'string'
                  ? JSON.parse(child.item.content)
                  : child.item.content;
              if (parsed && typeof parsed === 'object') {
                toolData = {
                  name: parsed.name || '工具调用',
                  args: parsed.args || {},
                  result: parsed.result || [],
                  id: parsed.id,
                };
              }
            } catch {
              toolData = { name: '工具调用', args: {}, result: [] };
            }

            return (
              <div
                key={child.item.message_id}
                className={styles.grandchildItem}
                style={{ padding: '0' }}
              >
                <ToolCallDisplay {...toolData} />
              </div>
            );
          }

          // 对 content_markdown 使用 Markdown 渲染，完整显示
          if (child.item.type === 'content_markdown') {
            return (
              <div
                key={child.item.message_id}
                className={styles.grandchildItem}
              >
                <div className={styles.level3MarkdownContent}>
                  <Markdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                  >
                    {typeof child.item.content === 'string'
                      ? child.item.content
                      : JSON.stringify(child.item.content)}
                  </Markdown>
                </div>
              </div>
            );
          }

          // 其它类型也使用 Markdown 渲染（不再只显示纯文本），以统一展示
          return (
            <div
              key={child.item.message_id}
              className={styles.grandchildItem}
              title={
                typeof child.item.content === 'string'
                  ? child.item.content
                  : JSON.stringify(child.item.content)
              }
            >
              <div className={styles.level3Indicator}>
                {getLevel3Display(child.item).icon}
              </div>
              <div className={styles.level3Content}>
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                >
                  {typeof child.item.content === 'string'
                    ? child.item.content
                    : JSON.stringify(child.item.content)}
                </Markdown>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染二级内容
  const renderLevel2Item = (node: ThinkingNode) => {
    const { item, children } = node;
    const isExpanded = expandedLevel2.has(item.message_id);

    return (
      <div key={item.message_id} className={styles.childItem}>
        <div className={styles.childHeader}>
          <div
            className={styles.childTitle}
            onClick={() => toggleExpandLevel2(item.message_id)}
          >
            {children.length > 0 && (
              <span
                className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
              >
                <RightOutlined />
              </span>
            )}
            {/* 仅在二级子项前显示颜色标识（小方块） */}
            <span className={styles.level2Marker} />
            <span>{getLevel2Title(item)}</span>
          </div>
        </div>

        {/* 二级进度条 */}
        {item.percentage !== undefined && (
          <div className={styles.childProgressBar}>
            <div className={styles.barContainer}>
              <div
                className={styles.barFill}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            {item.percentage === 100 && (
              <div className={styles.progressIcon}>
                <CheckOutlined style={{ color: '#52c41a', fontSize: 12 }} />
              </div>
            )}
          </div>
        )}

        {/* 二级项自身的内容（只有在无子节点时显示，且非 content_tool_call 使用 Markdown） */}
        {children.length === 0 &&
          item.content &&
          item.type !== 'content_tool_call' && (
            <div className={styles.childContent}>
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
              >
                {typeof item.content === 'string'
                  ? item.content
                  : JSON.stringify(item.content)}
              </Markdown>
            </div>
          )}

        {children.length === 0 &&
          item.content &&
          item.type === 'content_tool_call' &&
          (() => {
            let toolData: any = { name: '工具调用', args: {}, result: [] };
            try {
              const parsed =
                typeof item.content === 'string'
                  ? JSON.parse(item.content)
                  : item.content;
              if (parsed && typeof parsed === 'object') {
                toolData = {
                  name: parsed.name || '工具调用',
                  args: parsed.args || {},
                  result: parsed.result || [],
                  id: parsed.id,
                };
              }
            } catch {
              toolData = { name: '工具调用', args: {}, result: [] };
            }
            return (
              <div className={styles.childContent}>
                <ToolCallDisplay {...toolData} />
              </div>
            );
          })()}
        {/* 三级内容（仅显示子节点，不重复显示二级 content） */}
        {isExpanded && children.length > 0 && renderLevel3Items(children)}
      </div>
    );
  };

  // 计算 group 节点的平均 percentage（仅用于 GROUP_TYPES 分组，如 thinking_step_topic）
  const computeAveragePercentage = (node: ThinkingNode): number | undefined => {
    if (!node || !node.children || node.children.length === 0) return undefined;
    const vals: number[] = [];
    node.children.forEach((ch) => {
      const p = ch.item?.percentage;
      if (typeof p === 'number' && Number.isFinite(p)) vals.push(p);
    });
    if (vals.length === 0) return undefined;
    const sum = vals.reduce((s, v) => s + v, 0);
    return Math.round(sum / vals.length);
  };

  // 渲染一级内容
  const renderThinkingTree = () => {
    if (thinkingTree.length === 0) {
      return (
        <div className={styles.emptyState}>
          <Empty description="暂无思考过程数据" />
        </div>
      );
    }

    return (
      <div className={styles.thinkingContent}>
        {thinkingTree.map((node) => {
          const { item, children } = node;
          const isExpanded = expandedItems.has(item.message_id);

          return (
            <div key={item.message_id} className={styles.thinkingItem}>
              <div
                className={styles.itemHeader}
                onClick={() => toggleExpand(item.message_id)}
              >
                <div className={styles.title}>
                  {children.length > 0 && (
                    <span
                      className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                    >
                      <RightOutlined />
                    </span>
                  )}
                  <span>{getLevel1Title(item)}</span>
                </div>
              </div>

              {/* 一级进度条：优先显示自身 percentage；对分组节点（如 深度探索）也显示按子项计算的平均进度 */}
              {item.percentage !== undefined && (
                <div className={styles.progressBar}>
                  <div className={styles.barContainer}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  {item.percentage === 100 && (
                    <div className={styles.progressIcon}>
                      <CheckOutlined
                        style={{ color: '#52c41a', fontSize: 12 }}
                      />
                    </div>
                  )}

                  {/* 一级节点的具体内容：仅当不是简短单行文本时才渲染（避免重复）
                       content_tool_call 使用 ToolCallDisplay，其他使用 Markdown 渲染 */}
                  {!isSimpleSingleLineContent(item) && (
                    <div className={styles.level1Content}>
                      {item.type === 'content_tool_call' ? (
                        (() => {
                          let toolData: any = {
                            name: '工具调用',
                            args: {},
                            result: [],
                          };
                          try {
                            const parsed =
                              typeof item.content === 'string'
                                ? JSON.parse(item.content)
                                : item.content;
                            if (parsed && typeof parsed === 'object') {
                              toolData = {
                                name: parsed.name || '工具调用',
                                args: parsed.args || {},
                                result: parsed.result || [],
                                id: parsed.id,
                              };
                            }
                          } catch {
                            toolData = {
                              name: '工具调用',
                              args: {},
                              result: [],
                            };
                          }
                          return (
                            <div className={styles.level1ToolCall}>
                              <ToolCallDisplay {...toolData} />
                            </div>
                          );
                        })()
                      ) : (
                        <div className={styles.level1Markdown}>
                          <Markdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                          >
                            {typeof item.content === 'string'
                              ? item.content
                              : JSON.stringify(item.content)}
                          </Markdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 对于分组类型，计算并显示子项平均进度（如果存在） */}
              {GROUP_TYPES.includes(item.type) &&
                (() => {
                  const avg = computeAveragePercentage(node);
                  if (typeof avg === 'number') {
                    return (
                      <div className={styles.progressBar}>
                        <div className={styles.barContainer}>
                          <div
                            className={styles.barFill}
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                        {avg === 100 && (
                          <div className={styles.progressIcon}>
                            <CheckOutlined
                              style={{ color: '#52c41a', fontSize: 12 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

              {/* 二级内容 */}
              {isExpanded && children.length > 0 && (
                <div className={styles.childrenContainer}>
                  {children.map((child) => renderLevel2Item(child))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染报告内容
  const renderReportContent = () => {
    if (!reportContent) {
      return (
        <div className={styles.emptyState}>
          <Empty description="暂无报告数据" />
        </div>
      );
    }

    return (
      <div className={styles.reportContent}>
        <Markdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
        >
          {reportContent}
        </Markdown>
      </div>
    );
  };

  return (
    <div className={styles.thinkingPanel}>
      <div className={styles.panelHeader}>
        <Segmented
          value={activeTab}
          onChange={(value) => setActiveTab(value as 'thinking' | 'report')}
          options={[
            { label: '思考过程', value: 'thinking' },
            { label: '查看报告', value: 'report' },
          ]}
          block
        />
      </div>

      <Spin spinning={loading}>
        <div className={styles.panelContent}>
          {activeTab === 'thinking' && renderThinkingTree()}
          {activeTab === 'report' && renderReportContent()}
        </div>
      </Spin>
    </div>
  );
};

export default DeepInsightThinkingPanel;
