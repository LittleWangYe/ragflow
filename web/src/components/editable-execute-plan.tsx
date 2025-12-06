import { CheckCircleOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import React, { useMemo } from 'react';
import styles from './editable-execute-plan.module.less';

interface ExecutePlanItem {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

interface EditableExecutePlanProps {
  content: string | string[];
  messageId?: string;
  conversationId?: string;
  onStartResearch?: (plan: string) => void;
}

export const EditableExecutePlan: React.FC<EditableExecutePlanProps> = ({
  content,
  onStartResearch,
}) => {
  // Parse content into list items
  const planItems = useMemo(() => {
    let items: ExecutePlanItem[] = [];

    if (typeof content === 'string') {
      // Try to parse as JSON array first
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          items = parsed.map((item: any) => ({
            title: typeof item === 'string' ? item : item.title || '',
            description: item.description,
          }));
        } else if (typeof parsed === 'object') {
          items = [{ title: content }];
        }
      } catch {
        // If not JSON, treat as plain text and split by newline or specific markers
        const lines = content
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => ({ title: line.trim() }));
        items = lines.length > 0 ? lines : [{ title: content }];
      }
    } else if (Array.isArray(content)) {
      items = content.map((item) => ({
        title: typeof item === 'string' ? item : item,
      }));
    }

    return items;
  }, [content]);

  const handleStartResearch = () => {
    if (!content || (typeof content === 'string' && !content.trim())) {
      message.error('计划内容不能为空');
      return;
    }

    const contentStr =
      typeof content === 'string' ? content : JSON.stringify(content);
    onStartResearch?.(contentStr);
  };

  return (
    <div className={styles.planContainer}>
      <div className={styles.header}>
        <span className={styles.title}>执行规划</span>
      </div>

      {planItems.length > 0 ? (
        <>
          <div className={styles.itemList}>
            {planItems.map((item, index) => (
              <div key={index} className={styles.planItem}>
                <div className={styles.itemIcon}>
                  <CheckCircleOutlined />
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitle}>{item.title}</div>
                  {item.description && (
                    <div className={styles.itemDescription}>
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.timeEstimate}>
              <span className={styles.timeIcon}>⏱</span>
              <span>预计3-5分钟生成完成</span>
            </div>
            <Button
              type="primary"
              onClick={handleStartResearch}
              className={styles.startBtn}
            >
              开始研究
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.empty}>没有可用的研究计划</div>
      )}
    </div>
  );
};
