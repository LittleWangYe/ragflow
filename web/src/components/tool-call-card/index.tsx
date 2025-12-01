import { LinkOutlined } from '@ant-design/icons';
import { Empty, Flex, Tooltip } from 'antd';
import classNames from 'classnames';
import styles from './index.less';

interface ToolCallResult {
  title: string;
  url?: string;
  icon?: string;
  content?: string;
  snippet?: string;
}

interface ToolCallCardProps {
  name: string;
  id?: string;
  args?: Record<string, any>;
  result?: ToolCallResult[];
  index?: number;
  className?: string;
}

/**
 * 工具调用卡片组件 - 用于展示工具调用的结果
 * 采用卡片网格布局，参考业界接口调用页面的显示方式
 */
export const ToolCallCard = ({
  name,
  id,
  args = {},
  result = [],
  className,
}: ToolCallCardProps) => {
  // 获取工具名称显示
  const getToolName = () => {
    const toolNameMap: Record<string, { label: string; icon: string }> = {
      tavily_search: { label: '网络搜索', icon: '🌐' },
      google_search: { label: 'Google 搜索', icon: '🔍' },
      bing_search: { label: 'Bing 搜索', icon: '🔎' },
      arxiv_search: { label: 'ArXiv 搜索', icon: '📚' },
      default: { label: name, icon: '🔧' },
    };

    return toolNameMap[name] || toolNameMap['default'];
  };

  const toolInfo = getToolName();

  return (
    <div className={classNames(styles.toolCallCardWrapper, className)}>
      {/* 工具信息头 */}
      <div className={styles.toolHeader}>
        <Flex gap={8} align="center">
          <span className={styles.toolIcon}>{toolInfo.icon}</span>
          <div>
            <div className={styles.toolName}>{toolInfo.label}</div>
            {id && (
              <Tooltip title={id}>
                <div className={styles.toolId}>ID: {id.slice(0, 16)}...</div>
              </Tooltip>
            )}
          </div>
        </Flex>
      </div>

      {/* 搜索参数显示 */}
      {args && Object.keys(args).length > 0 && (
        <div className={styles.argsSection}>
          {Object.entries(args).map(([key, value]) => {
            let displayValue = '';
            if (Array.isArray(value)) {
              displayValue = value.join('; ');
            } else if (typeof value === 'object') {
              displayValue = JSON.stringify(value);
            } else {
              displayValue = String(value);
            }

            return (
              <div key={key} className={styles.argItem}>
                <span className={styles.argKey}>{key}:</span>
                <span className={styles.argValue}>{displayValue}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 结果卡片网格 */}
      {Array.isArray(result) && result.length > 0 ? (
        <div className={styles.resultGrid}>
          {result.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.resultCard}
            >
              {/* 网站 favicon */}
              {item.icon && (
                <img src={item.icon} alt="icon" className={styles.favicon} />
              )}

              {/* 标题 */}
              <div className={styles.resultTitle}>{item.title}</div>

              {/* 描述/snippet */}
              {(item.content || item.snippet) && (
                <div className={styles.resultSnippet}>
                  {item.content || item.snippet}
                </div>
              )}

              {/* URL 显示 */}
              {item.url && (
                <div className={styles.resultUrl}>
                  <LinkOutlined /> {item.url}
                </div>
              )}
            </a>
          ))}
        </div>
      ) : (
        <Empty description="无搜索结果" style={{ margin: '16px 0' }} />
      )}
    </div>
  );
};

export default ToolCallCard;
