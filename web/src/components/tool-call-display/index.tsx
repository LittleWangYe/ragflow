import { ApiOutlined, CopyOutlined } from '@ant-design/icons';
import { Collapse, Flex, Table } from 'antd';
import classNames from 'classnames';
import { useState } from 'react';
import styles from './index.less';

interface ToolCallDisplayProps {
  name: string;
  id?: string;
  args?: Record<string, any>;
  result?: any;
  index?: number;
  className?: string;
}

/**
 * 工具调用显示组件
 * 支持可折叠显示工具名称、参数、结果
 */
export const ToolCallDisplay = ({
  name,
  args = {},
  result = [],
  className,
}: ToolCallDisplayProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  // 获取结果描述（用于卡片显示）
  const getResultDescription = () => {
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return '无结果';
    }

    if (Array.isArray(result) && result.length > 0) {
      const firstItem = result[0];
      if (firstItem.title) {
        return firstItem.title;
      }
      if (firstItem.url) {
        return firstItem.url;
      }
    }

    return String(result).slice(0, 100);
  };

  // 获取显示的标题
  const displayTitle = name.charAt(0).toUpperCase() + name.slice(1);

  if (!expanded) {
    // 收起状态：显示简洁卡片
    return (
      <div
        className={classNames(styles.toolCallDisplay)}
        onClick={() => setExpanded(true)}
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.icon}>
          <ApiOutlined />
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{displayTitle}</div>
          <p className={styles.description}>{getResultDescription()}</p>
        </div>
      </div>
    );
  }

  // 展开状态：显示详细信息
  const formatArgs = () => {
    if (!args || Object.keys(args).length === 0) return '无参数';
    return JSON.stringify(args, null, 2);
  };

  const formatResultText = () => {
    if (!result) return '无结果';

    if (Array.isArray(result)) {
      return result
        .map((item: any, idx: number) => {
          const title = item.title || item.name || '未命名';
          const url = item.url || '';
          return `${idx + 1}. ${title}${url ? ` (${url})` : ''}`;
        })
        .join('\n');
    }

    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }

    return String(result);
  };

  const buildTableColumns = () => {
    if (!Array.isArray(result) || result.length === 0) {
      return [];
    }

    const sampleItem = result[0];
    const columns: any[] = [];

    if (sampleItem.title || sampleItem.name) {
      columns.push({
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (text: string) => text || '-',
        width: '40%',
      });
    }

    if (sampleItem.url) {
      columns.push({
        title: '链接',
        dataIndex: 'url',
        key: 'url',
        render: (url: string) =>
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </a>
          ) : (
            '-'
          ),
        width: '40%',
      });
    }

    if (sampleItem.icon) {
      columns.push({
        title: '图标',
        dataIndex: 'icon',
        key: 'icon',
        render: (icon: string) =>
          icon ? (
            <img src={icon} alt="icon" className={styles.tableIcon} />
          ) : (
            '-'
          ),
        width: '10%',
      });
    }

    if (columns.length === 0 && (sampleItem.content || sampleItem.snippet)) {
      columns.push({
        title: '内容',
        dataIndex: 'content',
        key: 'content',
        render: (text: string, record: any) => text || record.snippet || '-',
        width: '100%',
      });
    }

    return columns;
  };

  const argsText = formatArgs();
  const resultText = formatResultText();
  const resultCount = Array.isArray(result) ? result.length : 0;
  const resultColumns = buildTableColumns();
  const tableData = Array.isArray(result)
    ? result.map((item, idx) => ({
        key: idx,
        ...item,
      }))
    : [];

  const items = [
    {
      key: 'args',
      label: (
        <Flex gap={8} align="center">
          <ApiOutlined />
          <span>参数 ({Object.keys(args).length})</span>
        </Flex>
      ),
      children: (
        <div className={styles.contentBlock}>
          <pre className={styles.code}>{argsText}</pre>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(argsText);
            }}
          >
            <CopyOutlined /> {copied ? '已复制' : '复制'}
          </button>
        </div>
      ),
    },
    {
      key: 'result',
      label: (
        <Flex gap={8} align="center">
          <ApiOutlined />
          <span>结果 ({resultCount})</span>
        </Flex>
      ),
      children: (
        <div className={styles.contentBlock}>
          {Array.isArray(result) && result.length > 0 ? (
            <>
              <Table
                columns={resultColumns}
                dataSource={tableData}
                pagination={false}
                size="small"
                className={styles.resultTable}
                bordered
              />
              <button
                type="button"
                className={styles.copyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(resultText);
                }}
              >
                <CopyOutlined /> {copied ? '已复制' : '复制'}
              </button>
            </>
          ) : (
            <span className={styles.empty}>无结果</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div
      className={classNames(styles.toolCallDisplay, styles.expanded, className)}
      style={{
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
        onClick={() => setExpanded(false)}
      >
        <div className={styles.icon}>
          <ApiOutlined />
        </div>
        <div className={styles.content} style={{ flex: '0 1 auto' }}>
          <div className={styles.title}>{displayTitle}</div>
          <p className={styles.description}>{getResultDescription()}</p>
        </div>
      </div>

      <Collapse
        items={items}
        accordion={false}
        className={styles.collapse}
        defaultActiveKey={['result']}
      />
    </div>
  );
};

export default ToolCallDisplay;
