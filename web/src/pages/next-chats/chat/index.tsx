import EmbedDialog from '@/components/embed-dialog';
import { useShowEmbedModal } from '@/components/embed-dialog/use-show-embed-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SharedFrom } from '@/constants/chat';
import { useSetModalState } from '@/hooks/common-hooks';
import {
  useFetchConversation,
  useGetChatSearchParams,
} from '@/hooks/use-chat-request';
import { cn } from '@/lib/utils';
import { isEmpty } from 'lodash';
import { ArrowUpRight, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'umi';
import { useHandleClickConversationCard } from '../hooks/use-click-card';
import { ChatSettings } from './app-settings/chat-settings';
import { MultipleChatBox } from './chat-box/multiple-chat-box';
import { SingleChatBox } from './chat-box/single-chat-box';
import { Sessions } from './sessions';
import { useAddChatBox } from './use-add-box';
import { useSwitchDebugMode } from './use-switch-debug-mode';

export default function Chat() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { data: conversation } = useFetchConversation();

  const { handleConversationCardClick, controller, stopOutputMessage } =
    useHandleClickConversationCard();
  const { visible: settingVisible, switchVisible: switchSettingVisible } =
    useSetModalState(false);
  const {
    removeChatBox,
    addChatBox,
    chatBoxIds,
    hasSingleChatBox,
    hasThreeChatBox,
  } = useAddChatBox();

  const { hideEmbedModal, embedVisible, beta } = useShowEmbedModal();

  const { conversationId, isNew } = useGetChatSearchParams();
  const searchParams = new URLSearchParams(window.location.search);
  const conversationApi = searchParams.get('conversationApi') || '';
  const isDeepinsightMode = conversationApi === 'deepinsightChat';
  const [thinkingPanelVisible, setThinkingPanelVisible] =
    useState(isDeepinsightMode);

  const { isDebugMode, switchDebugMode } = useSwitchDebugMode();

  if (isDebugMode) {
    return (
      <section className="pt-14 h-[100vh] pb-24">
        <div className="flex items-center justify-between px-10 pb-5">
          <span className="text-2xl">
            {t('chat.multipleModels')} ({chatBoxIds.length}/3)
          </span>
          <Button variant={'ghost'} onClick={switchDebugMode}>
            {t('chat.exit')} <LogOut />
          </Button>
        </div>
        <MultipleChatBox
          chatBoxIds={chatBoxIds}
          controller={controller}
          removeChatBox={removeChatBox}
          addChatBox={addChatBox}
          stopOutputMessage={stopOutputMessage}
        ></MultipleChatBox>
      </section>
    );
  }

  return (
    <section className="h-full flex flex-col overflow-hidden">
      {/* Breadcrumb 和嵌入网站代码按钮已隐藏 */}
      <div className="flex flex-1 min-h-0 pr-5">
        <Sessions
          hasSingleChatBox={hasSingleChatBox}
          handleConversationCardClick={handleConversationCardClick}
          switchSettingVisible={switchSettingVisible}
          isDeepinsightMode={isDeepinsightMode}
          thinkingPanelVisible={thinkingPanelVisible}
          onToggleThinkingPanel={() =>
            setThinkingPanelVisible(!thinkingPanelVisible)
          }
        ></Sessions>

        <Card className="flex-1 min-w-0 bg-transparent border h-full">
          <CardContent className="flex flex-col p-0 h-full min-h-0">
            <Card className="flex flex-col flex-1 bg-transparent min-w-0 min-h-0">
              <CardHeader
                className={cn('p-4', { 'border-b': hasSingleChatBox })}
              >
                <CardTitle className="flex justify-between items-center text-base">
                  <div className="truncate">{conversation.name}</div>
                  <Button
                    variant={'ghost'}
                    onClick={switchDebugMode}
                    disabled={
                      hasThreeChatBox ||
                      isEmpty(conversationId) ||
                      isNew === 'true'
                    }
                  >
                    <ArrowUpRight /> {t('chat.multipleModels')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 min-h-0">
                <SingleChatBox
                  controller={controller}
                  stopOutputMessage={stopOutputMessage}
                  thinkingPanelVisible={
                    isDeepinsightMode ? thinkingPanelVisible : true
                  }
                ></SingleChatBox>
              </CardContent>
            </Card>
            {settingVisible && (
              <ChatSettings
                switchSettingVisible={switchSettingVisible}
              ></ChatSettings>
            )}
          </CardContent>
        </Card>
      </div>
      {embedVisible && (
        <EmbedDialog
          visible={embedVisible}
          hideModal={hideEmbedModal}
          token={id!}
          from={SharedFrom.Chat}
          beta={beta}
          isAgent={false}
        ></EmbedDialog>
      )}
    </section>
  );
}
