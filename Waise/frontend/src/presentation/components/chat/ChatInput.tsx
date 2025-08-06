import React from 'react';
import TextBox from '../textMessagesBox/TextBox';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  showBar: boolean;
  onToggleBar: () => void;
  isLoading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  showBar,
  onToggleBar,
  isLoading = false
}) => {
  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <TextBox
          onSendMessage={onSendMessage}
          placeHolder="Escribe tu mensaje aquí..."
          disableCorrections={true}
          showBar={showBar}
          onToggleBar={onToggleBar}
          disabled={isLoading}
        />
      </div>
      
      {isLoading && (
        <div className="input-loading-indicator">
          <span>wAIse está escribiendo...</span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;