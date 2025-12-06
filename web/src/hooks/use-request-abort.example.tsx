/**
 * 如何在页面中使用导航锁定和请求中止
 *
 * 示例：数据列表页面
 */

import { useNavigationLock } from '@/hooks/use-navigation-lock';
import { useEffect, useState } from 'react';

export function DatasetPage() {
  const { getAbortSignal } = useNavigationLock();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const signal = getAbortSignal();

    setLoading(true);

    // 使用 signal 参数中止请求
    fetch('/api/datasets', { signal })
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      })
      .catch((err) => {
        // 如果是因为路由切换导致的中止，error.name 为 'AbortError'
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch data:', err);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [getAbortSignal]);

  return (
    <div>{loading ? <div>Loading...</div> : <div>{/* 列表内容 */}</div>}</div>
  );
}

/**
 * 与 API 客户端库配合使用
 *
 * 示例：使用 axios
 */

import axios from 'axios';

export function ChatPage() {
  const { getAbortSignal } = useNavigationLock();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const signal = getAbortSignal();

    // axios 支持 signal 参数
    axios
      .get('/api/chat', { signal })
      .then((res) => setMessages(res.data))
      .catch((err) => {
        if (err.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch messages:', err);
        }
      });
  }, [getAbortSignal]);

  return <div>{/* 聊天界面 */}</div>;
}

/**
 * 关键特性说明：
 *
 * 1. 自动中止：
 *    - 用户快速切换菜单时，前一个页面的请求会被自动中止
 *    - 不需要手动管理请求生命周期
 *
 * 2. 防止数据污染：
 *    - 切换后的新页面不会被前一个页面的延迟响应所污染
 *    - 确保数据始终与当前显示页面对应
 *
 * 3. 性能优化：
 *    - 中止不必要的网络请求
 *    - 释放网络带宽和服务器资源
 *
 * 4. 错误处理：
 *    - 被中止的请求会触发 AbortError
 *    - 可以通过 err.name === 'AbortError' 来识别
 *    - 避免将中止错误当作真正的请求失败
 */
