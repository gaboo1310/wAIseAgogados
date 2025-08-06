import React from 'react';
import UserDropdown from '../userDropdown/UserDropdown';

interface ChatHeaderProps {
  showNewIcon: boolean;
  onToggleSearch?: () => void;
  onOpenLibrary: () => void;
  onOpenFocus: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  showNewIcon,
  onToggleSearch,
  onOpenLibrary,
  onOpenFocus
}) => {
  return (
    <div className="chat-header">
      <div className="header-left">
        <div className="chat-icons">
          {showNewIcon && (
            <img
              src="/icons/chatgpt.png"
              alt="search"
              className="search-icon"
              onClick={onToggleSearch}
            />
          )}
        </div>
      </div>

      <div className="header-center">
        <div className="chat-title">
          <h1>wAIse Assistant</h1>
        </div>
      </div>

      <div className="header-right">
        <div className="action-buttons">
          <button 
            className="action-btn library-btn"
            onClick={onOpenLibrary}
            title="Abrir biblioteca"
          >
            <img src="/icons/library.svg" alt="library" />
          </button>
          
          <button 
            className="action-btn focus-btn"
            onClick={onOpenFocus}
            title="Configurar enfoque"
          >
            <img src="/icons/focusing.svg" alt="focus" />
          </button>
        </div>
        
        <UserDropdown />
      </div>
    </div>
  );
};

export default ChatHeader;