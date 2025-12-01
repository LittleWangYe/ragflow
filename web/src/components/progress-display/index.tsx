import { ProgressStep } from '@/interfaces/database/chat';
import { formatElapsedTime } from '@/utils/deepinsight-stream-parser';
import { Flex, Progress } from 'antd';
import classNames from 'classnames';
import styles from './index.less';

interface IProps {
  progress?: number; // 0-100 当前进度百分比
  progressSteps?: ProgressStep[]; // 进度步骤列表
  elapsedTime?: number; // 已耗时（毫秒）
  showElapsedTime?: boolean; // 是否显示耗时（默认只在进度完成时显示）
  className?: string;
}

/**
 * 进度条显示组件
 * 显示结构：
 * 1. 进度条和百分比 + 耗时
 * 2. 最后的进度说明文本
 */
export const ProgressDisplay = ({
  progress = 0,
  progressSteps = [],
  elapsedTime = 0,
  showElapsedTime = true,
  className,
}: IProps) => {
  if (progress === 0 && progressSteps.length === 0) {
    return null;
  }

  const lastStep = progressSteps[progressSteps.length - 1];
  const isComplete = progress === 100;

  return (
    <Flex
      vertical
      gap={8}
      className={classNames(styles.progressDisplay, className)}
    >
      <div>
        <Flex justify="space-between" align="center" gap={8}>
          <span className={styles.progressLabel}>
            {isComplete ? '✅ 已完成' : '⏳ 处理中...'}
          </span>
          {/* 显示百分比和耗时 */}
          <span className={styles.progressStats}>
            {progress}%
            {showElapsedTime && elapsedTime > 0 && (
              <>
                <span className={styles.separator}>|</span>
                {formatElapsedTime(elapsedTime)}
              </>
            )}
          </span>
        </Flex>
        <Progress
          percent={progress}
          size="small"
          format={() => ''}
          status={isComplete ? 'success' : 'active'}
        />
      </div>

      {/* 显示最后的进度说明 */}
      {lastStep && (
        <div className={styles.progressStep}>
          <span className={styles.stepContent}>{lastStep.content}</span>
        </div>
      )}
    </Flex>
  );
};

export default ProgressDisplay;
