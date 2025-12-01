import { HomeCard } from '@/components/home-card';
import { MoreButton } from '@/components/more-button';
import { ChatSearchParams } from '@/constants/chat';
import { IDialog } from '@/interfaces/database/chat';
import { Routes } from '@/routes';
import { useCallback } from 'react';
import { useNavigate } from 'umi';
import { ChatDropdown } from './chat-dropdown';
import { useRenameChat } from './hooks/use-rename-chat';

export type IProps = {
  data: IDialog;
  index?: number;
} & Pick<ReturnType<typeof useRenameChat>, 'showChatRenameModal'>;

export function ChatCard({ data, index = 0, showChatRenameModal }: IProps) {
  const navigate = useNavigate();

  /**
   * 根据列表位置添加 conversationApi 参数：
   * - 第 0 项：不添加参数
   * - 第 1 项：参数值为 deepinsightChat
   * - 第 2 项：参数值为 deepinsightConferenceQuestion
   */
  const handleNavigateToChat = useCallback(() => {
    let url = `${Routes.Chat}/${data?.id}`;

    if (index === 1) {
      url += `?${ChatSearchParams.ConversationApi}=deepinsightChat`;
    } else if (index === 2) {
      url += `?${ChatSearchParams.ConversationApi}=deepinsightConferenceQuestion`;
    }

    navigate(url);
  }, [navigate, data?.id, index]);

  return (
    <HomeCard
      data={{
        name: data.name,
        description: data.description,
        avatar: data.icon,
        update_time: data.update_time,
      }}
      moreDropdown={
        <ChatDropdown chat={data} showChatRenameModal={showChatRenameModal}>
          <MoreButton></MoreButton>
        </ChatDropdown>
      }
      onClick={handleNavigateToChat}
    />
  );
}
