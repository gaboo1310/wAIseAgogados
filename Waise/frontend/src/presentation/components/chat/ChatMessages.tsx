import React from 'react';
import { Message } from '../../../hooks/useChat';
import GptMessages from '../chat-bubles/GptMessages';
import MyMessages from '../chat-bubles/MyMessages';
import LoaderTyping from '../loader/LoaderTyping';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  isEmpty: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  isEmpty
}) => {
  if (isEmpty && !isLoading) {
    return (
      <div className="empty-chat-state">
        <div className="empty-state-content">
          <div className="empty-state-icon">
            <img src="/icons/marval.png" alt="wAIse" />
          </div>
          <h3>¡Hola! Soy wAIse</h3>
          <p>Tu asistente legal inteligente. ¿En qué puedo ayudarte hoy?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className="message-wrapper">
            {message.isGpt ? (
              <GptMessages text={message.text} />
            ) : (
              <MyMessages text={message.text} />
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="message-wrapper">
            <LoaderTyping />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;