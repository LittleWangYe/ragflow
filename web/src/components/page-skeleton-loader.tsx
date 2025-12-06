// 加载骨架屏组件示例
// 路径: src/components/page-skeleton-loader.tsx

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageSkeletonLoaderProps {
  /**
   * 行数，默认 3
   */
  rowCount?: number;
  /**
   * 是否显示头部骨架
   */
  showHeader?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 通用页面加载骨架屏
 * 用于显示页面正在加载的状态
 */
export function PageSkeletonLoader({
  rowCount = 3,
  showHeader = true,
  className,
}: PageSkeletonLoaderProps) {
  return (
    <div className={cn('w-full space-y-4', className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {Array.from({ length: rowCount }).map((_, i) => (
        <Card key={i} className="border-border-button bg-transparent">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 表格加载骨架屏
 */
export function TableSkeletonLoader({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* 表头 */}
      <div className="flex gap-3 pb-3 border-b border-border-button">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* 表行 */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * 卡片列表加载骨架屏
 */
export function CardListSkeletonLoader({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border-button bg-transparent">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 使用示例
 *
 * import { PageSkeletonLoader } from '@/components/page-skeleton-loader';
 *
 * export function MyPage() {
 *   const [isLoading, setIsLoading] = useState(true);
 *   const [data, setData] = useState(null);
 *
 *   useEffect(() => {
 *     fetchData().then((result) => {
 *       setData(result);
 *       setIsLoading(false);
 *     });
 *   }, []);
 *
 *   if (isLoading) {
 *     return <PageSkeletonLoader rowCount={3} />;
 *   }
 *
 *   return <PageContent data={data} />;
 * }
 */
