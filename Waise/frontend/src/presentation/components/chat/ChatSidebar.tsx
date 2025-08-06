import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../../../hooks/useChat';

interface ChatSidebarProps {
  isVisible: boolean;
  chatHistory: Chat[];
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  currentConversationId: string | null;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isVisible,
  chatHistory,
  onToggle,
  onNewChat,
  onSelectChat,
  currentConversationId
}) => {
  const navigate = useNavigate();

  return (
    <div className={`chat-sidebar ${isVisible ? '' : 'hidden'}`}>
      <div className="project-header">
        <button className="project-button" onClick={() => navigate("/welcome")}>
          <h2>wAIse</h2>
        </button>
        <button onClick={onToggle}>
          <img src="/icons/sidebar.svg" alt="sidebar" className="sidebar-icon" />
        </button>
      </div>

      <div className="chat-list">
        <div className="new-chat-section">
          <button className="new-chat-button" onClick={onNewChat}>
            <span>+</span>
            <span>Nueva conversación</span>
          </button>
        </div>

        <div className="chat-history">
          <h3 className="chat-history-title">Conversaciones recientes</h3>
          {chatHistory.length > 0 ? (
            <div className="chat-history-list">
              {chatHistory.map((chat, index) => (
                <button
                  key={index}
                  className={`chat-history-item ${
                    currentConversationId === chat.conversationId ? 'active' : ''
                  }`}
                  onClick={() => onSelectChat(chat)}
                  title={chat.text}
                >
                  <div className="chat-preview">
                    <span className="chat-text">{chat.text}</span>
                    <span className="chat-date">{chat.createdAt}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="no-chats">
              <p>No hay conversaciones anteriores</p>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-navigation">
          <button 
            className="nav-item"
            onClick={() => navigate('/upload-documents')}
          >
            <img src="/icons/library.svg" alt="library" />
            <span>Subir documentos</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => navigate('/document-generator')}
          >
            <img src="/icons/Edit.png" alt="generate" />
            <span>Generar documento</span>
          </button>
          <button 
            className="nav-item"
            onClick={() => navigate('/saved-documents')}
          >
            <img src="/icons/save.svg" alt="saved" />
            <span>Documentos guardados</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;