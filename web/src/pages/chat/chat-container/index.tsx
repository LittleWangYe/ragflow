import MessageItem from '@/components/message-item';
import { ChatSearchParams, MessageType } from '@/constants/chat';
import { Flex, Spin } from 'antd';
import {
  useCreateConversationBeforeUploadDocument,
  useGetFileIcon,
  useGetSendButtonDisabled,
  useSendButtonDisabled,
  useSendNextMessage,
} from '../hooks';
import { buildMessageItemReference } from '../utils';

import DeepInsightThinkingPanel from '@/components/deepinsight-thinking-panel';
import MessageInput from '@/components/message-input';
import PdfDrawer from '@/components/pdf-drawer';
import { useClickDrawer } from '@/components/pdf-drawer/hooks';
import {
  useFetchNextConversation,
  useFetchNextDialog,
  useGetChatSearchParams,
} from '@/hooks/chat-hooks';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { AnswerItem } from '@/interfaces/database/chat';
import { buildMessageUuidWithRole } from '@/utils/chat';
import { memo, useMemo } from 'react';
import styles from './index.less';

interface IProps {
  controller: AbortController;
  settingsPanelOpen?: boolean;
}

const ChatContainer = ({ controller, settingsPanelOpen = false }: IProps) => {
  const { conversationId } = useGetChatSearchParams();
  const { data: conversation } = useFetchNextConversation();
  const { data: currentDialog } = useFetchNextDialog();

  // 获取路由参数，判断是否为 deepinsight 模式
  const searchParams = new URLSearchParams(window.location.search);
  const conversationApi =
    searchParams.get(ChatSearchParams.ConversationApi) || '';
  const isDeepinsightMode = conversationApi === 'deepinsightChat';

  const {
    value,
    scrollRef,
    messageContainerRef,
    loading,
    sendLoading,
    derivedMessages,
    handleInputChange,
    handlePressEnter,
    regenerateMessage,
    removeMessageById,
    stopOutputMessage,
  } = useSendNextMessage(controller);

  // 提取deepinsight思考数据
  const thinkingData = useMemo(() => {
    const lastMessage = derivedMessages?.[derivedMessages.length - 1];
    // 尝试从 answer 字段获取数据，而不是 answerArray
    const answerArray =
      lastMessage?.data?.answer || lastMessage?.data?.answerArray;
    if (
      lastMessage?.role === MessageType.Assistant &&
      Array.isArray(answerArray)
    ) {
      return answerArray as AnswerItem[];
    }
    return [];
  }, [derivedMessages]);

  // 在 deepinsight 模式下，过滤掉 type 为 think 和 result 的消息
  const filteredMessages = useMemo(() => {
    if (!isDeepinsightMode) {
      return derivedMessages;
    }
    return derivedMessages?.filter((msg) => {
      // 保留所有用户消息
      if (msg.role === MessageType.User) {
        return true;
      }
      // 对于助手消息，过滤掉 type 为 think 或 result 的
      if (msg.role === MessageType.Assistant) {
        const messageType = msg.data?.type;
        return messageType !== 'think' && messageType !== 'result';
      }
      return true;
    });
  }, [derivedMessages, isDeepinsightMode]);

  // 检测是否为deepinsightChat模式
  const isDeepinsightChat = useMemo(() => {
    return thinkingData.length > 0;
  }, [thinkingData]);

  const { visible, hideModal, documentId, selectedChunk, clickDocumentButton } =
    useClickDrawer();
  const disabled = useGetSendButtonDisabled();
  const sendDisabled = useSendButtonDisabled(value);
  useGetFileIcon();
  const { data: userInfo } = useFetchUserInfo();
  const { createConversationBeforeUploadDocument } =
    useCreateConversationBeforeUploadDocument();

  return (
    <>
      <Flex
        flex={1}
        className={`${styles.chatContainer} ${isDeepinsightChat ? styles.withThinkingPanel : ''}`}
        vertical
      >
        <Flex
          flex={1}
          className={styles.messageWrapper}
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          <Flex
            flex={1}
            vertical
            className={styles.messageContainer}
            ref={messageContainerRef}
          >
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <Spin spinning={loading}>
                {filteredMessages?.map((message, i) => {
                  return (
                    <MessageItem
                      loading={
                        message.role === MessageType.Assistant &&
                        sendLoading &&
                        filteredMessages.length - 1 === i
                      }
                      key={buildMessageUuidWithRole(message)}
                      item={message}
                      nickname={userInfo.nickname}
                      avatar={userInfo.avatar}
                      avatarDialog={currentDialog.icon}
                      reference={buildMessageItemReference(
                        {
                          message: derivedMessages,
                          reference: conversation.reference,
                        },
                        message,
                      )}
                      clickDocumentButton={clickDocumentButton}
                      index={i}
                      removeMessageById={removeMessageById}
                      regenerateMessage={regenerateMessage}
                      sendLoading={sendLoading}
                    ></MessageItem>
                  );
                })}
              </Spin>
            </div>
            <div ref={scrollRef} />
          </Flex>

          {isDeepinsightChat && !settingsPanelOpen && (
            <div className={styles.thinkingPanelWrapper}>
              <DeepInsightThinkingPanel
                data={thinkingData}
                loading={sendLoading}
              />
            </div>
          )}
        </Flex>
        <MessageInput
          disabled={disabled}
          sendDisabled={sendDisabled}
          sendLoading={sendLoading}
          value={value}
          onInputChange={handleInputChange}
          onPressEnter={handlePressEnter}
          conversationId={conversationId}
          createConversationBeforeUploadDocument={
            createConversationBeforeUploadDocument
          }
          stopOutputMessage={stopOutputMessage}
        ></MessageInput>
      </Flex>
      <PdfDrawer
        visible={visible}
        hideModal={hideModal}
        documentId={documentId}
        chunk={selectedChunk}
      ></PdfDrawer>
    </>
  );
};

export default memo(ChatContainer);
