import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { v4 as uuidv4 } from 'uuid';
import { toZonedTime, format } from 'date-fns-tz';

export interface Message {
  text: string;
  isGpt: boolean;
  iconSrc?: string;
  timestamp?: string;
  conversationId?: string;
}

export interface Chat {
  conversationId: string;
  text: string;
  createdAt: string;
}

interface UseChatReturn {
  messages: Message[];
  chatHistory: Chat[];
  isLoading: boolean;
  currentConversationId: string | null;
  conversationId: string;
  isEmpty: boolean;
  
  handlePost: (prompt: string) => Promise<void>;
  fetchMessages: (conversationId?: string) => Promise<void>;
  fetchChatHistory: () => Promise<void>;
  handleSelectChat: (chat: Chat) => void;
  handleNewChat: () => void;
  mapMessages: (responseMessages: any[]) => Message[];
}

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>(() => uuidv4());
  
  const { getAccessTokenSilently } = useAuth0();
  
  const isEmpty = messages.length === 0;

  const mapMessages = useCallback((responseMessages: any[]): Message[] => {
    return responseMessages.map((msg: any) => ({
      text: msg.text,
      isGpt: msg.isGpt,
      iconSrc: "/icons/marval.png",
      timestamp: msg.timestamp,
      conversationId: msg.conversationId
    }));
  }, []);

  const handlePost = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    
    const newMessage: Message = {
      text: prompt,
      isGpt: false,
      timestamp: new Date().toISOString(),
      conversationId: conversationId
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_ASSISTANT_API}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      let assistantResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantResponse += parsed.content;
                
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  
                  if (lastIndex >= 0 && newMessages[lastIndex].isGpt) {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      text: assistantResponse
                    };
                  } else {
                    newMessages.push({
                      text: assistantResponse,
                      isGpt: true,
                      iconSrc: "/icons/marval.png",
                      timestamp: new Date().toISOString(),
                      conversationId: conversationId
                    });
                  }
                  
                  return newMessages;
                });
              }
            } catch (e) {
              console.warn('Error parsing JSON:', e);
            }
          }
        }
      }

      await fetchChatHistory();

    } catch (error) {
      console.error('Error in handlePost:', error);
      setMessages(prev => [...prev, {
        text: 'Error: No se pudo procesar la solicitud. Inténtalo de nuevo.',
        isGpt: true,
        iconSrc: "/icons/marval.png",
        timestamp: new Date().toISOString(),
        conversationId: conversationId
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, getAccessTokenSilently]);

  const fetchMessages = useCallback(async (targetConversationId?: string) => {
    const idToFetch = targetConversationId || conversationId;
    if (!idToFetch) return;

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/messages?conversationId=${idToFetch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const responseMessages = await response.json();
        const mappedMessages = mapMessages(responseMessages);
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [conversationId, getAccessTokenSilently, mapMessages]);

  const fetchChatHistory = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/messages/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const chats = await response.json();
        setChatHistory(chats.map((chat: any) => ({
          conversationId: chat.conversationId,
          text: chat.text.length > 50 ? chat.text.substring(0, 50) + '...' : chat.text,
          createdAt: format(toZonedTime(new Date(chat.createdAt), 'America/New_York'), 'dd/MM/yyyy HH:mm', { timeZone: 'America/New_York' })
        })));
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, [getAccessTokenSilently]);

  const handleSelectChat = useCallback((chat: Chat) => {
    setCurrentConversationId(chat.conversationId);
    setConversationId(chat.conversationId);
    fetchMessages(chat.conversationId);
  }, [fetchMessages]);

  const handleNewChat = useCallback(() => {
    const newConversationId = uuidv4();
    setConversationId(newConversationId);
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  return {
    messages,
    chatHistory,
    isLoading,
    currentConversationId,
    conversationId,
    isEmpty,
    handlePost,
    fetchMessages,
    fetchChatHistory,
    handleSelectChat,
    handleNewChat,
    mapMessages
  };
};