import { FileUploadProps } from '@/components/file-upload';
import { MessageType } from '@/constants/chat';
import {
  useHandleMessageInputChange,
  useRegenerateMessage,
  useSelectDerivedMessages,
  useSendMessageWithSse,
} from '@/hooks/logic-hooks';
import {
  useFetchConversation,
  useGetChatSearchParams,
} from '@/hooks/use-chat-request';
import { Message } from '@/interfaces/database/chat';
import api from '@/utils/api';
import { trim } from 'lodash';
import { useCallback, useEffect } from 'react';
import { useParams } from 'umi';
import { v4 as uuid } from 'uuid';
import { IMessage } from '../chat/interface';
import useConversationApi from './use-conversation-api';
import { useFindPrologueFromDialogList } from './use-select-conversation-list';
import { useSetChatRouteParams } from './use-set-chat-route';
import { useSetConversation } from './use-set-conversation';
import { useUploadFile } from './use-upload-file';

export const useSelectNextMessages = () => {
  const {
    scrollRef,
    messageContainerRef,
    setDerivedMessages,
    derivedMessages,
    addNewestAnswer,
    addNewestQuestion,
    removeLatestMessage,
    removeMessageById,
    removeMessagesAfterCurrentMessage,
  } = useSelectDerivedMessages();
  const { data: conversation, loading } = useFetchConversation();
  const { conversationId, isNew } = useGetChatSearchParams();
  const { id: dialogId } = useParams();
  const prologue = useFindPrologueFromDialogList();

  const addPrologue = useCallback(() => {
    if (dialogId !== '' && isNew === 'true') {
      const nextMessage = {
        role: MessageType.Assistant,
        content: prologue,
        id: uuid(),
      } as IMessage;

      setDerivedMessages([nextMessage]);
    }
  }, [dialogId, isNew, prologue, setDerivedMessages]);

  useEffect(() => {
    addPrologue();
  }, [addPrologue]);

  useEffect(() => {
    if (
      conversationId &&
      isNew !== 'true' &&
      conversation.message?.length > 0
    ) {
      setDerivedMessages(conversation.message);
    }

    if (!conversationId) {
      setDerivedMessages([]);
    }
  }, [conversation.message, conversationId, setDerivedMessages, isNew]);

  return {
    scrollRef,
    messageContainerRef,
    derivedMessages,
    loading,
    addNewestAnswer,
    addNewestQuestion,
    removeLatestMessage,
    removeMessageById,
    removeMessagesAfterCurrentMessage,
  };
};

export const useSendMessage = (
  controller: AbortController,
  selectedKbs?: string[],
  webSearch?: boolean,
) => {
  const { setConversation } = useSetConversation();
  const { conversationId, isNew } = useGetChatSearchParams();
  const { handleInputChange, value, setValue } = useHandleMessageInputChange();

  const { handleUploadFile, fileIds, clearFileIds, isUploading, removeFile } =
    useUploadFile();

  const url = useConversationApi();
  const { send, answer, done } = useSendMessageWithSse(url);
  const {
    scrollRef,
    messageContainerRef,
    derivedMessages,
    loading,
    addNewestAnswer,
    addNewestQuestion,
    removeLatestMessage,
    removeMessageById,
    removeMessagesAfterCurrentMessage,
  } = useSelectNextMessages();
  const { setConversationIsNew, getConversationIsNew } =
    useSetChatRouteParams();

  const onUploadFile: NonNullable<FileUploadProps['onUpload']> = useCallback(
    async (files, options) => {
      const isNew = getConversationIsNew();

      if (isNew === 'true' && Array.isArray(files) && files.length) {
        const data = await setConversation(files[0].name, true);
        if (data.code === 0) {
          handleUploadFile(files, options, data.data?.id);
        }
      } else {
        handleUploadFile(files, options);
      }
    },
    [getConversationIsNew, handleUploadFile, setConversation],
  );

  const sendMessage = useCallback(
    async ({
      message,
      currentConversationId,
      messages,
    }: {
      message: Message;
      currentConversationId?: string;
      messages?: Message[];
    }) => {
      let body: any = {
        conversation_id: currentConversationId ?? conversationId,
        messages: [...(messages ?? derivedMessages ?? []), message],
      };

      // 如果是 deepinsight API，添加 deepinsight 特定参数
      if (
        url === api.deepinsightConferenceQuestion ||
        url === api.deepinsightChat
      ) {
        body.type = 'chat';
        body.sources = {
          knowledge: selectedKbs ?? [],
          web_search: webSearch ?? false,
          intra_search: false,
          write_experts: [],
          review_experts: [],
        };
        body.deepinsight_mode = 'normal';
      }

      const res = await send(body, controller);

      if (res && (res?.response.status !== 200 || res?.data?.code !== 0)) {
        // cancel loading
        setValue(typeof message.content === 'string' ? message.content : '');
        console.info('removeLatestMessage111');
        removeLatestMessage();
      }
    },
    [
      derivedMessages,
      conversationId,
      removeLatestMessage,
      setValue,
      send,
      controller,
      url,
      selectedKbs,
      webSearch,
    ],
  );

  const handleSendMessage = useCallback(
    async (message: Message) => {
      const isNew = getConversationIsNew();
      if (isNew !== 'true') {
        sendMessage({ message });
      } else {
        const data = await setConversation(
          typeof message.content === 'string' ? message.content : '',
          true,
          conversationId,
        );
        if (data.code === 0) {
          setConversationIsNew('');
          const id = data.data.id;
          // currentConversationIdRef.current = id;
          sendMessage({
            message,
            currentConversationId: id,
            messages: data.data.message,
          });
        }
      }
    },
    [
      setConversation,
      sendMessage,
      setConversationIsNew,
      getConversationIsNew,
      conversationId,
    ],
  );

  const { regenerateMessage } = useRegenerateMessage({
    removeMessagesAfterCurrentMessage,
    sendMessage,
    messages: derivedMessages,
  });

  useEffect(() => {
    //  #1289
    if (answer.answer && conversationId && isNew !== 'true') {
      addNewestAnswer(answer);
    }
  }, [answer, addNewestAnswer, conversationId, isNew]);

  const handlePressEnter = useCallback(() => {
    if (trim(value) === '') return;
    const id = uuid();

    addNewestQuestion({
      content: value,
      doc_ids: fileIds,
      id,
      role: MessageType.User,
    });
    if (done) {
      setValue('');
      handleSendMessage({
        id,
        content: value.trim(),
        role: MessageType.User,
        doc_ids: fileIds,
      });
    }
    clearFileIds();
  }, [
    value,
    addNewestQuestion,
    fileIds,
    done,
    clearFileIds,
    setValue,
    handleSendMessage,
  ]);

  return {
    handlePressEnter,
    handleInputChange,
    value,
    setValue,
    regenerateMessage,
    sendLoading: !done,
    loading,
    scrollRef,
    messageContainerRef,
    derivedMessages,
    removeMessageById,
    handleUploadFile: onUploadFile,
    isUploading,
    removeFile,
    handleSendMessage,
    addNewestQuestion,
  };
};
