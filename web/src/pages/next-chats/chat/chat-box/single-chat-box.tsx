import DeepInsightThinkingPanel from '@/components/deepinsight-thinking-panel';
import { NextMessageInput } from '@/components/message-input/next';
import MessageItem from '@/components/message-item';
import PdfDrawer from '@/components/pdf-drawer';
import { useClickDrawer } from '@/components/pdf-drawer/hooks';
import { ChatSearchParams, MessageType } from '@/constants/chat';
import {
  useFetchConversation,
  useFetchDialog,
  useGetChatSearchParams,
} from '@/hooks/use-chat-request';
import { useFetchUserInfo } from '@/hooks/user-setting-hooks';
import { AnswerItem } from '@/interfaces/database/chat';
import { buildMessageUuidWithRole } from '@/utils/chat';
import { useMemo, useState } from 'react';
import {
  useGetSendButtonDisabled,
  useSendButtonDisabled,
} from '../../hooks/use-button-disabled';
import { useCreateConversationBeforeUploadDocument } from '../../hooks/use-create-conversation';
import { useSendMessage } from '../../hooks/use-send-chat-message';
import { buildMessageItemReference } from '../../utils';

interface IProps {
  controller: AbortController;
  stopOutputMessage(): void;
  thinkingPanelVisible?: boolean;
}

export function SingleChatBox({
  controller,
  stopOutputMessage,
  thinkingPanelVisible = true,
}: IProps) {
  const {
    value,
    scrollRef,
    messageContainerRef,
    sendLoading,
    derivedMessages,
    isUploading,
    handleInputChange,
    handlePressEnter,
    regenerateMessage,
    removeMessageById,
    handleUploadFile,
    removeFile,
  } = useSendMessage(controller);
  const { data: userInfo } = useFetchUserInfo();
  const { data: currentDialog } = useFetchDialog();
  const { createConversationBeforeUploadDocument } =
    useCreateConversationBeforeUploadDocument();
  const { conversationId } = useGetChatSearchParams();
  const { data: conversation } = useFetchConversation();
  const disabled = useGetSendButtonDisabled();
  const sendDisabled = useSendButtonDisabled(value);
  const { visible, hideModal, documentId, selectedChunk, clickDocumentButton } =
    useClickDrawer();
  const [selectedKbs, setSelectedKbs] = useState<string[]>([]);

  // 获取路由参数，判断是否为 deepinsight 模式
  const searchParams = new URLSearchParams(window.location.search);
  const conversationApi =
    searchParams.get(ChatSearchParams.ConversationApi) || '';
  const isDeepinsightMode = conversationApi === 'deepinsightChat';

  // 提取思考数据 - 只包含 process='think' 或 type 为思考相关的项
  const thinkingData = useMemo(() => {
    if (!isDeepinsightMode) {
      return [];
    }
    const lastMessage = derivedMessages?.[derivedMessages.length - 1];
    const answerArray =
      lastMessage?.data?.answer || lastMessage?.data?.answerArray;
    if (
      lastMessage?.role === MessageType.Assistant &&
      Array.isArray(answerArray)
    ) {
      // Filter to include thinking-related items and result items for the right panel
      const thinkingTypes = [
        'thinking_step_outline',
        'thinking_step_topic',
        'thinking_step_analysis',
        'think',
        'result',
      ];
      return (answerArray as AnswerItem[]).filter(
        (item) =>
          item?.process === 'think' || thinkingTypes.includes(item?.type),
      );
    }
    return [];
  }, [derivedMessages, isDeepinsightMode]);

  // DEV-only debug: print summary to help troubleshoot filtering issues
  // placed after filteredMessages is computed so we can inspect results
  // (only in development to avoid noise in production)

  // DEV-only debug: print summary to help troubleshoot filtering issues
  // placed after filteredMessages is computed so we can inspect results
  // (only in development to avoid noise in production)

  // (debug logging moved down to after filteredMessages declaration)

  // Helper function to check if an item should be filtered out
  const shouldFilterOutItem = (item: any): boolean => {
    if (!item) return true;
    // In deepinsight mode, only keep items with process==='' (empty string) AND type!=='result'
    // This filters out all items that have a non-empty process and result type items
    const isEmptyProcess = item.process === '';
    const isResultType = item.type === 'result';

    return !isEmptyProcess || isResultType;
  };

  // Helper function to strip think/result tags from content string
  const stripThinkAndResultTags = (content: string): string => {
    if (!content) return content;
    // Remove <think>...</think> and <result>...</result> tags
    let stripped = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<result>[\s\S]*?<\/result>/gi, '');
    // Clean up any extra whitespace
    stripped = stripped.replace(/^\s+|\s+$/g, '');
    return stripped;
  };

  // 在 deepinsight 模式下，过滤掉 type 为 think 和 result 的内容项
  const filteredMessages = useMemo(() => {
    if (!isDeepinsightMode) {
      return derivedMessages;
    }

    return derivedMessages
      ?.map((msg) => {
        if (msg.role !== MessageType.Assistant) {
          return msg;
        }

        const newMsg = { ...msg } as any;

        // Normalize both answer and answerArray to arrays
        // Also check if content field itself is an array (from streaming data)
        let answers = Array.isArray(msg.data?.answer)
          ? msg.data.answer
          : Array.isArray(msg.data?.answerArray)
            ? msg.data.answerArray
            : Array.isArray(msg.content)
              ? msg.content
              : null;

        if (!answers || !Array.isArray(answers)) {
          // Even if no answer array, strip think/result tags from content
          return {
            ...newMsg,
            content: stripThinkAndResultTags(newMsg.content),
          };
        }

        // Deep filter: remove blocked items and their nested children
        const recursiveFilter = (items: any[]): any[] => {
          return items
            .filter((item) => !shouldFilterOutItem(item))
            .map((item) => {
              // If item has nested children/answer arrays, recursively filter them
              if (Array.isArray(item.children)) {
                return {
                  ...item,
                  children: recursiveFilter(item.children),
                };
              }
              if (Array.isArray(item.answer)) {
                return {
                  ...item,
                  answer: recursiveFilter(item.answer),
                };
              }
              return item;
            });
        };

        const filtered = recursiveFilter(answers);

        if (filtered.length === 0) {
          // If all content is filtered out, return null to hide this message
          return null;
        }

        // Ensure filtered items are used for rendering: write filtered array to content
        // and also preserve it on data.answer/answerArray for downstream usage
        newMsg.content = filtered;
        if (Array.isArray(msg.data?.answer)) {
          newMsg.data = { ...msg.data, answer: filtered };
        } else if (Array.isArray(msg.data?.answerArray)) {
          newMsg.data = { ...msg.data, answerArray: filtered };
        } else {
          newMsg.data = { ...msg.data, answer: filtered };
        }

        return newMsg;
      })
      .filter((msg): msg is any => msg !== null)
      .map((msg: any) => {
        let contentStr = msg.content;

        // If content is an array (from streaming data), convert to string
        if (Array.isArray(msg.content)) {
          contentStr = msg.content
            .map((item: any) => item.content || '')
            .join('\n');
        }

        return {
          ...msg,
          content: stripThinkAndResultTags(contentStr),
        };
      });
  }, [derivedMessages, isDeepinsightMode]);

  // DEV-only debug (after filteredMessages computed)
  if (process.env.NODE_ENV === 'development' && isDeepinsightMode) {
    try {
      const summarizeItem = (item: any) => {
        if (!item) return null;
        // if item is primitive
        if (typeof item !== 'object') return item;
        const summary: any = {
          id: item.message_id || item.id || item.messageId || undefined,
          type: item.type,
          process: item.process,
          content:
            typeof item.content === 'string'
              ? item.content.slice(0, 200)
              : undefined,
        };
        return summary;
      };

      const summarizeMessage = (msg: any) => {
        if (!msg) return null;
        const answerArray = Array.isArray(msg.data?.answer)
          ? msg.data.answer
          : Array.isArray(msg.data?.answerArray)
            ? msg.data.answerArray
            : Array.isArray(msg.content)
              ? msg.content
              : null;

        return {
          role: msg.role,
          id: msg.id,
          content:
            typeof msg.content === 'string'
              ? msg.content.slice(0, 200)
              : undefined,
          answers: Array.isArray(answerArray)
            ? answerArray.map(summarizeItem)
            : null,
        };
      };

      // eslint-disable-next-line no-console
      console.debug(
        'deepinsight debug',
        JSON.stringify(
          {
            derivedMessagesCount: derivedMessages?.length ?? 0,
            filteredMessagesCount: filteredMessages?.length ?? 0,
            sampleDerivedLast: summarizeMessage(
              derivedMessages?.[derivedMessages.length - 1],
            ),
            sampleFilteredFirst: summarizeMessage(filteredMessages?.[0]),
          },
          null,
          2,
        ),
      );
    } catch (e) {
      // noop
    }
  }

  return (
    <section className="flex flex-col p-5 h-full">
      <div className="flex flex-1 min-h-0 gap-3">
        {/* 左边：聊天内容和输入框 */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div
            ref={messageContainerRef}
            className="flex-1 overflow-auto min-h-0"
          >
            <div className="w-full pr-5">
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
                        message: filteredMessages,
                        reference: conversation.reference,
                      },
                      message,
                    )}
                    clickDocumentButton={clickDocumentButton}
                    index={i}
                    removeMessageById={removeMessageById}
                    regenerateMessage={regenerateMessage}
                    sendLoading={sendLoading}
                    isDeepinsightChat={isDeepinsightMode}
                  ></MessageItem>
                );
              })}
            </div>
            <div ref={scrollRef} />
          </div>

          <div className="mt-3 flex-shrink-0">
            <NextMessageInput
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
              onUpload={handleUploadFile}
              isUploading={isUploading}
              removeFile={removeFile}
              showAttachmentButton={!isDeepinsightMode}
              isDeepinsightMode={isDeepinsightMode}
              selectedKbs={selectedKbs}
              onKbChange={setSelectedKbs}
            />
          </div>
        </div>

        {/* 右边的思考面板 - 在 deepinsight 模式下显示 */}
        {isDeepinsightMode &&
          thinkingData.length > 0 &&
          thinkingPanelVisible && (
            <div className="flex-1 border-l border-gray-200 overflow-y-auto h-full bg-white flex-shrink-0 flex flex-col">
              <DeepInsightThinkingPanel
                data={thinkingData}
                loading={sendLoading}
              />
            </div>
          )}
      </div>

      {visible && (
        <PdfDrawer
          visible={visible}
          hideModal={hideModal}
          documentId={documentId}
          chunk={selectedChunk}
        ></PdfDrawer>
      )}
    </section>
  );
}
