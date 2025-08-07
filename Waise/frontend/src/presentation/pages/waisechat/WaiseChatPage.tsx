import { useState, useRef, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { toZonedTime, format } from 'date-fns-tz';
import "./waisechat.css";
import "./waisechat2.css";
import TextBox from "../../components/textMessagesBox/TextBox";
import GptMessages from "../../components/chat-bubles/GptMessages";
import MyMessages from "../../components/chat-bubles/MyMessages";
import LoaderTyping from "../../components/loader/LoaderTyping";
// prosConsStreamUseCase removed - using direct API calls
import PageItem from "../../components/pageSection/PageItem";
import SectionItem from "../../components/pageSection/SectionItem";
import SubsectionItem from "../../components/pageSection/SubsectionItem";
import { getSubsectionsForSection, preloadedPages } from './sectionUtils';
import UserDropdown from '../../components/userDropdown/UserDropdown';
import { useAuth0 } from '@auth0/auth0-react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from '../../../hooks/useSession';

interface ClickedButtons {
  [key: string]: boolean | { [key: string]: boolean };
}

interface SelectedSubsection {
  page: number | null;
  section: string | null;
}

interface Message {
  text: string;
  isGpt: boolean;
  iconSrc?: string;
  timestamp?: string;
  conversationId?: string;
}

interface Chat {
  conversationId: string;
  text: string;
  createdAt: string;
}

const WaiseChatPage = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently, user } = useAuth0();
  const { isInitializing, sessionError } = useSession();
  

  const [, setInputValue] = useState<string>('');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [showBar, setShowBar] = useState<boolean>(false);
  const [showBarSettings, setShowBarSettings] = useState<boolean>(false);
  const [showSuccessCard, setShowSuccessCard] = useState<boolean>(false);
  const [clickedPageButtons, setClickedPageButtons] = useState<ClickedButtons>({});
  const [clickedSectionButtons, setClickedSectionButtons] = useState<ClickedButtons>({});
  const [showLibraryCard, setLibraryCard] = useState<boolean>(false);
  const [showFocusingCard, setFocusingCard] = useState<boolean>(false);
  const [showSectionsCard, setShowSectionsCard] = useState<boolean>(false);
  const [selectedPageSections, setSelectedPageSections] = useState<string[]>([]);
  const [showBackArrow, setShowBackArrow] = useState<boolean>(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
  const [showSubsectionCard, setShowSubsectionCard] = useState<boolean>(false);
  const [selectedSubsection, setSelectedSubsection] = useState<SelectedSubsection>({ page: null, section: null });
  const [subsections, setSubsections] = useState<string[]>([]);
  const [clickedSubsectionButtons, setClickedSubsectionButtons] = useState<ClickedButtons>({});
  // const [activeAI,] = useState<string>(localStorage.getItem("activeAI") || "wAIse"); // Not used
  const [] = useState<string>(localStorage.getItem("activeIcon") || "/icons/default.svg");
  const [currentConversationId, setCurrentConversationId] = useState<string>(() => {
    const savedId = sessionStorage.getItem('currentConversationId');
    return savedId || uuidv4();
  });

  const abortController = useRef<AbortController>(new AbortController());
  const isRunning = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewIcon, setShowNewIcon] = useState<boolean>(false);
  const barSettingsRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setConversationId] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<Chat[]>([]);

  const [focusValue, setFocusValue] = useState<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentConversationId) {
      sessionStorage.setItem('currentConversationId', currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    const savedState = localStorage.getItem('clickedSubsectionButtons');
    if (savedState) {
      setClickedSubsectionButtons(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    const savedSubsectionState = localStorage.getItem('clickedSubsectionButtons');
    const savedSectionState = localStorage.getItem('clickedSectionButtons');
    const savedPageState = localStorage.getItem('clickedPageButtons');

    if (savedSubsectionState) {
      setClickedSubsectionButtons(JSON.parse(savedSubsectionState));
    }
    if (savedSectionState) {
      setClickedSectionButtons(JSON.parse(savedSectionState));
    }
    if (savedPageState) {
      setClickedPageButtons(JSON.parse(savedPageState));
    }
  }, []);

  useEffect(() => {
    if (showFocusingCard) {
      const savedFocus = localStorage.getItem('focusPrompt') || '';
      setFocusValue(savedFocus);
    }
  }, [showFocusingCard]);

  const mapMessages = (data: any[]) => data.map((msg: any) => ({
    text: msg.text,
    isGpt: msg.isGpt === true || msg.isGpt === "true",
    iconSrc: msg.iconSrc,
    timestamp: msg.timestamp,
    conversationId: msg.conversationId,
  }));

  const fetchMessages = async (conversationId: string) => {
    try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND}/messages/${conversationId}`);
        const data = await res.json();
        setMessages(mapMessages(data));
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
    }
};

const fetchChatHistory = async () => {
  if (!user) {
    console.error("No se pudo obtener el usuario de Auth0");
    return;
  }
  const userId = user.sub;
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND}/messages/history/${userId}`);
    const data = await res.json();
    setChatHistory(data);
  } catch (error) {
    console.error('Error al obtener el historial de chats:', error);
  }
};

useEffect(() => {
  fetchChatHistory();
}, [user]);

const handlePost = async (message: string, useWebSearch: boolean) => {
  // --- Asegura que siempre haya un conversationId válido ---
  let conversationIdToUse = currentConversationId;
  if (!conversationIdToUse || !sessionStorage.getItem('currentConversationId')) {
    const newId = uuidv4();
    sessionStorage.setItem('currentConversationId', newId);
    setCurrentConversationId(newId);
    conversationIdToUse = newId;
  }

  console.log("🔍 Enviando mensaje con uso de búsqueda web:", useWebSearch);
  if (!message.trim()) return;

  // Usamos el `user` de Auth0 para obtener la información del usuario
  const userId = user?.sub;

  if (!userId) {
    console.error("No se pudo obtener el ID del usuario de Auth0");
    return;
  }

  const newMessage = {
    text: message,
    isGpt: false,
    userId,
    conversationId: conversationIdToUse,
  };

  setMessages((prevMessages) => [...prevMessages, newMessage]);

  try {
    await fetch(`${import.meta.env.VITE_BACKEND}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMessage),
    });
    // Actualizar el historial después de guardar el mensaje del usuario
    await fetchChatHistory();
  } catch (error) {
    console.error('Error al guardar el mensaje:', error);
  }

  if (isRunning.current) {
    abortController.current.abort();
    abortController.current = new AbortController();
  }

  setIsLoading(true);
  isRunning.current = true;

  // Construir la lista jerárquica de fuentes/secciones/subsecciones seleccionadas
  const selectedLibraries: string[] = [];

  // 1. Páginas completas seleccionadas
  Object.keys(clickedPageButtons).forEach((key) => {
    if (clickedPageButtons[key]) {
      selectedLibraries.push(preloadedPages[parseInt(key, 10)].name);
    }
  });

  // 2. Secciones seleccionadas
  Object.keys(clickedSectionButtons).forEach((pageKey) => {
    const pageSections = clickedSectionButtons[pageKey];
    if (typeof pageSections === 'object' && pageSections !== null) {
      Object.keys(pageSections).forEach((sectionKey) => {
        if (pageSections[sectionKey]) {
          const pageName = preloadedPages[parseInt(pageKey, 10)].name;
          const sectionName = preloadedPages[parseInt(pageKey, 10)].sections[parseInt(sectionKey, 10)];
          selectedLibraries.push(`${pageName}/${sectionName}`);
        }
      });
    }
  });

  // 3. Subsecciones seleccionadas
  Object.keys(clickedSubsectionButtons).forEach((key) => {
    if (clickedSubsectionButtons[key]) {
      // key es del tipo "pageName-sectionName-subsectionName"
      const [pageName, sectionName, subsectionName] = key.split('-');
      selectedLibraries.push(`${pageName}/${sectionName}/${subsectionName}`);
    }
  });

  // Obtener el enfoque guardado
  const focusPrompt = localStorage.getItem('focusPrompt');

  // Direct API call to backend streaming endpoint
  const token = await getAccessTokenSilently();
  const response = await fetch(`${import.meta.env.VITE_GPT_API}/pros-cons-discusser-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt: message,
      conversationId: conversationIdToUse,
      useWebSearch,
      selectedLibraries,
      focus: focusPrompt
    }),
    signal: abortController.current.signal
  });

  if (!response.ok) {
    throw new Error('Failed to get response from server');
  }

  const reader = response.body?.getReader();
  
  setIsLoading(false);

  if (!reader) {
      const errorMessage = { text: "Hubo un error, intenta de nuevo.", isGpt: true };
      setMessages((prev) => [...prev, errorMessage]);
      isRunning.current = false;
      return;
  }

  const decoder = new TextDecoder();
  let aiMessage = '';
  setMessages((prevMessages) => [...prevMessages, { text: aiMessage, isGpt: true }]);

  while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const decodedChunk = decoder.decode(value, { stream: true });
      aiMessage += decodedChunk;

      setMessages((messages) => {
          const newMessages = [...messages];
          newMessages[newMessages.length - 1].text = aiMessage;
          return newMessages;
      });
  }

  try {
      const gptMessage = { text: aiMessage, isGpt: true, userId, conversationId: conversationIdToUse };
      await fetch(`${import.meta.env.VITE_BACKEND}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gptMessage),
      });
      // Actualizar el historial después de guardar el mensaje de la IA
      await fetchChatHistory();
  } catch (error) {
      console.error('Error al guardar el mensaje de la IA:', error);
  }

  isRunning.current = false;
};


  const handleClick = () => {
    setShowNewIcon(!showNewIcon);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleTickPageButtonClick = (pageIndex: number) => {
    setClickedPageButtons((prevClickedButtons) => ({
      ...prevClickedButtons,
      [pageIndex]: !prevClickedButtons[pageIndex],
    }));
  };

  const handleTickSectionButtonClick = (pageIndex: number, sectionIndex: number) => {
    setClickedSectionButtons((prevClickedButtons) => {
      const pageButtons = prevClickedButtons[pageIndex];
      if (typeof pageButtons === 'object' && pageButtons !== null) {
        return {
          ...prevClickedButtons,
          [pageIndex]: {
            ...pageButtons,
            [sectionIndex]: !pageButtons[sectionIndex],
          },
        };
      } else {
        return {
          ...prevClickedButtons,
          [pageIndex]: {
            [sectionIndex]: true,
          },
        };
      }
    });
  };

  const handleTickSubsectionButtonClick = (pageName: string, sectionName: string, subsectionName: string) => {
    setClickedSubsectionButtons((prevClickedButtons) => ({
      ...prevClickedButtons,
      [`${pageName}-${sectionName}-${subsectionName}`]: !prevClickedButtons[`${pageName}-${sectionName}-${subsectionName}`],
    }));
  };

  const handleSelectChat = async (conversationId: string) => {
    if (!user) {
        console.error("No se pudo obtener el usuario de Auth0");
        return;
    }

    const userId = user.sub;  // Usamos el `sub` de Auth0 para obtener el ID único del usuario
    setConversationId(conversationId);
    fetchMessages(conversationId);

    const res = await fetch(`${import.meta.env.VITE_BACKEND}/messages/${userId}`);
    const allMessages = await res.json();

    const conversationMessages = allMessages.filter((msg: any) => msg.conversationId === conversationId);
    
    setMessages(mapMessages(conversationMessages));  // Mostrar el chat completo
  };

  
  const handleSave = () => {
    localStorage.setItem('clickedSubsectionButtons', JSON.stringify(clickedSubsectionButtons));
    localStorage.setItem('clickedSectionButtons', JSON.stringify(clickedSectionButtons));
    localStorage.setItem('clickedPageButtons', JSON.stringify(clickedPageButtons));
    localStorage.setItem('focusPrompt', focusValue);
    setShowSuccessCard(true);
    setLibraryCard(false);
    setFocusingCard(false);
    setShowSectionsCard(false);
    setShowBackArrow(false);
    setShowSubsectionCard(false);
  };

  const handleClose = () => {
    setFocusingCard(false);
    setLibraryCard(false);
    setShowSuccessCard(false);
    setShowSectionsCard(false);
    setShowBackArrow(false);
    setShowSubsectionCard(false);
  };

  const handleReset = () => {
    setClickedSubsectionButtons({});
    setClickedSectionButtons({});
    setClickedPageButtons({});
    localStorage.removeItem('clickedSubsectionButtons');
    localStorage.removeItem('clickedSectionButtons');
    localStorage.removeItem('clickedPageButtons');
  };

  const handleNewChat = async () => {
    const newConversationId = uuidv4();
    setMessages([]);
    setInputValue('');
    setCurrentConversationId(newConversationId);
    sessionStorage.setItem('currentConversationId', newConversationId);
    
    // Actualizar el historial de chats
    if (user) {
      await fetchChatHistory();
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (barSettingsRef.current && !barSettingsRef.current.contains(event.target as Node)) {
      setShowBarSettings(false);
    }
  };

  const handlePageClick = (pageIndex: number, sections: string[]) => {
    setSelectedPageIndex(pageIndex);
    setSelectedPageSections(sections);
    setShowSectionsCard(true);
    setLibraryCard(false);
    setShowBackArrow(true);
  };

  const handleBackClick = () => {
    setShowSectionsCard(false);
    setLibraryCard(true);
    setShowBackArrow(false);
  };

  const handleSectionClick = (section: string) => {
    const subsections = getSubsectionsForSection(preloadedPages[selectedPageIndex!].name, section);
    if (subsections.length > 0) {
      setSelectedSubsection({ page: selectedPageIndex, section });
      setSubsections(subsections);
      setShowSubsectionCard(true);
      setShowSectionsCard(false);
      setShowBackArrow(true);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside as EventListener);
    };
  }, []);

  const handleSelectAll = () => {
    // Marcar todas las páginas
    const allPages = preloadedPages.reduce((acc, _, pageIndex) => {
      acc[pageIndex] = true; // Marca la página como seleccionada
      return acc;
    }, {} as { [key: number]: boolean });
  
    // Marcar todas las secciones
    const allSections = preloadedPages.reduce((acc, page, pageIndex) => {
      acc[pageIndex] = page.sections.reduce((sectionAcc, _, sectionIndex) => {
        sectionAcc[sectionIndex] = true; // Marca la sección como seleccionada
        return sectionAcc;
      }, {} as { [key: number]: boolean });
      return acc;
    }, {} as { [key: number]: { [key: number]: boolean } });
  
    // Marcar todas las subsecciones
    const allSubsections = preloadedPages.reduce((acc, page) => {
      page.sections.forEach((section) => {
        const subsections = getSubsectionsForSection(page.name, section); // Obtiene las subsecciones
        subsections.forEach((subsection) => {
          acc[`${page.name}-${section}-${subsection}`] = true; // Marca la subsección como seleccionada
        });
      });
      return acc;
    }, {} as { [key: string]: boolean });
  
    // Actualizar los estados
    setClickedPageButtons(allPages);
    setClickedSectionButtons(allSections);
    setClickedSubsectionButtons(allSubsections);
  };

  // Asegura que siempre haya un conversationId válido al cargar la página
  useEffect(() => {
    if (!sessionStorage.getItem('currentConversationId')) {
      const newId = uuidv4();
      sessionStorage.setItem('currentConversationId', newId);
      setCurrentConversationId(newId);
    }
  }, []);

  // Handle authentication redirect - let useSession handle session management
  useEffect(() => {
    if (!user?.sub && !isInitializing) {
      console.log('[WaiseChatPage] User not authenticated, redirecting to welcome');
      navigate('/welcome');
    }
  }, [user, isInitializing, navigate]);

  // Handle session errors
  useEffect(() => {
    if (sessionError && !isInitializing) {
      console.error('[WaiseChatPage] Session error:', sessionError);
      navigate('/welcome');
    }
  }, [sessionError, isInitializing, navigate]);

  return (
    <div className="waise-chat-container">
      {isInitializing ? (
        <div className="loading-container">
          <h2>Iniciando sesión...</h2>
        </div>
      ) : (
        <div className="chat-wrapper">
          <div className="chat-main">
          {showFocusingCard && <div className="overlay active" onClick={handleClose}></div>}
          {showFocusingCard && (
            <div className="focusing-card">
              <div className="focusing-card-top">
                <button className="back-arrow" onClick={handleBackClick}>
                  <img src="/icons/backarrow.png" alt="Back" />
                </button>
                <img src="/icons/close.svg" className="close-icon" onClick={() => setFocusingCard(false)} />
                <img src="/icons/focusing.svg" />
                <h1>Enfoque</h1>
                <h2>Define el enfoque que tendrán las respuestas de tus<br></br> asistentes de inteligencia artificial</h2>
              </div>
              <div className="textarea-container">
                <textarea
                  id="focus-input"
                  placeholder="Escribe tu promt aqui..."
                  className="focus-input"
                  rows={6}
                  value={focusValue}
                  onChange={(e) => setFocusValue(e.target.value)}
                ></textarea>
                <button className="save-button-focus" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          )}
          {showSectionsCard && <div className="overlay active" onClick={handleClose}></div>}
          {showSectionsCard && (
            <div className="sections-card">
              <div className="sections-card-top">
                <button className="back-arrow" onClick={handleBackClick}>
                  <img src="/icons/backarrow.png" alt="Back" />
                </button>
                <img src="/icons/close.svg" className="close-icon" onClick={handleClose} />
                <h1>Secciones</h1>
              </div>
              <div className="sections-list">
                <ul>
                  {selectedPageSections.map((section, sectionIndex) => (
                    <SectionItem
                      key={sectionIndex}
                      section={section}
                      pageIndex={selectedPageIndex!}
                      sectionIndex={sectionIndex}
                      clickedSectionButtons={clickedSectionButtons}
                      handleTickSectionButtonClick={handleTickSectionButtonClick}
                      handleSectionClick={handleSectionClick}
                    />
                  ))}
                </ul>
              </div>
              <div className="footer-sections">
                <button className="save-button-sections" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          )}
          {showSubsectionCard && <div className="overlay active" onClick={handleClose}></div>}
          {showSubsectionCard && (
            <div className="subsection-card">
              <div className="subsection-card-top">
                <button className="back-arrow" onClick={() => { setShowSubsectionCard(false); setShowSectionsCard(true); }}>
                  <img src="/icons/backarrow.png" alt="Back" />
                </button>
                <img src="/icons/close.svg" className="close-icon" onClick={handleClose} />
                <h1>Subsección {selectedSubsection.section}</h1>
              </div>
              <div className="subsection-content">
                <ul>
                  {subsections.map((subsection, index) => (
                    <li key={index}>
                      <SubsectionItem
                        subsection={subsection}
                        pageName={preloadedPages[selectedSubsection.page!].name}
                        sectionName={selectedSubsection.section!}
                        clickedSubsectionButtons={clickedSubsectionButtons}
                        handleTickSubsectionButtonClick={handleTickSubsectionButtonClick}
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="footer-subsection">
                <button className="save-button-focus" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          )}
          {showLibraryCard && <div className="overlay active" onClick={handleClose}></div>}
          {showLibraryCard && (
            <div className="library-card">
              <div className="library-card-top">
                <img src="/icons/close.svg" className="close-icon" onClick={() => setLibraryCard(false)} />
                <img src="/icons/library.svg" />
                <h1>Biblioteca</h1>
                <h2>Selecciona las páginas que utilizarás</h2>
              </div>
              <div className="file-list-container">
                <div className="file-list">
                  <ul>
                    {preloadedPages.map((page, pageIndex) => (
                      <PageItem
                        key={pageIndex}
                        page={page}
                        pageIndex={pageIndex}
                        clickedPageButtons={clickedPageButtons}
                        handleTickPageButtonClick={handleTickPageButtonClick}
                        handlePageClick={handlePageClick}
                      />
                    ))}
                  </ul>
                </div>
              </div>
              <div className="footer-library">
                <button className="select-all-button-library" onClick={handleSelectAll}>
                  Seleccionar Todo
                </button>
                <button className="reset-button-library" onClick={handleReset}>
                  Reiniciar
                </button>
                <button className="save-button-library" onClick={handleSave}>
                  Guardar
                </button>
              </div>
            </div>
          )}
          
          {showBackArrow && (
            <button className="back-arrow" onClick={handleBackClick}>
              <img src="/icons/back-arrow.svg" alt="Back" />
            </button>
          )}

          <div className={`chat-sidebar ${isSidebarVisible ? '' : 'hidden'}`}>
            <div className="project-header">
              <button className="project-button" onClick={() => navigate("/welcome")}>
                <h2>wAIse</h2>
              </button>
              <button onClick={toggleSidebar}>
                <img src="/icons/sidebar.svg" alt="sidebar" className="sidebar-icon" />
              </button>
            </div>
            <button className="new-chat-btn" onClick={handleNewChat}>Nuevo chat <img src="/icons/Edit.png" alt="Edit" className="Edit-icon" /></button>
            <div className="chat-history">
              <h3>Historial de Chats</h3>
              {chatHistory
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Orden descendente
                .map((chat: any) => {
                  const timeZone = 'America/Santiago';
                  const zonedTime = toZonedTime(chat.createdAt, timeZone);
                  const formattedDate = format(zonedTime, 'dd/MM/yyyy, HH:mm', { timeZone });

                  return (
                    <div key={chat.conversationId}>
                      <button onClick={() => handleSelectChat(chat.conversationId)} className="history-button">
                        <div>
                          <p>{chat.text.slice(0, 200)}</p>
                          <span className="chat-date">{formattedDate}</span>
                        </div>
                      </button>
                    </div>
                  );
                })}
            </div>
            <div className="options" style={{display: 'none'}}>
              <button className="options-button" onClick={() => setShowBarSettings(!showBarSettings)}>
                <img src="/icons/Settings.svg" alt="Settings" className="settings-icon" />
                <div className="options-text-container">
                  <span className="options-text">Opciones avanzadas</span>
                  <span className="options-subtext">Modifica tu prompt</span>
                </div>
              </button>

              {showBarSettings && (
                <div className="upload-bar-settings" ref={barSettingsRef}>
                  <button className='upload-bar-settings-button' onClick={() => setFocusingCard(!showFocusingCard)}>
                    <img src="/icons/focusing.svg" alt="download" className="focusing-icon" />
                    <div className="options-text-container">
                      <span className="options-text">Enfoque</span>
                      <span className="options-subtext">Personaliza tu respuesta</span>
                    </div>
                  </button>
                  <button className='upload-bar-settings-button' onClick={() => setLibraryCard(!showLibraryCard)}>
                    <img src="/icons/library.svg" alt="download" className="library-icon" />
                    <div className="options-text-container">
                      <span className="options-text">Biblioteca</span>
                      <span className="options-subtext">Añadir documentos</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <div className="dashboard-button-container">
              <button className="dashboard-return-btn" onClick={() => navigate("/dashboard")}>
                <img src="/icons/dashboard.svg" alt="Dashboard" />
                <span>Volver al Dashboard</span>
              </button>
            </div>
          </div>

          <div className="chat-button-content">
            {!isSidebarVisible && (
              <button className="show-sidebar-btn" onClick={toggleSidebar}>
                <img src="/icons/sidebar.svg" alt="Mostrar Sidebar" className="sidebar-icon" />
              </button>
            )}

            <div className='icons-top'>
              <button
            onClick={handleClick}
            className={`icon-button ${showNewIcon ? "icon-button-on" : ""}`}
          >
            <div className="icon-with-text">
              {showNewIcon ? (
                <span className="internet-icon-on">🌐</span>
              ) : (
                <span className="internet-icon-off">🌐</span>
              )}
              <span className="icon-text">Buscar en<br /> internet</span>
            </div>
          </button>
              <UserDropdown />
            </div>
            <div className="chat-content">
              {messages.length === 0 && (
                <div className="empty-chat-state">
                  <h1>¿Qué necesitas saber?</h1>
                  <h2>Estás trabajando con wAIse</h2>
                </div>
              )}
              {messages.length > 0 && (
                <div className="chat-messages">
                  <div className="grid">
                    {messages.map((msg, idx) =>
                      msg.isGpt
                        ? <GptMessages key={idx} text={msg.text} iconSrc={msg.iconSrc || '/icons/marval.png'} isLastMessage={idx === messages.length - 1} />
                        : <MyMessages key={idx} text={msg.text} />
                    )}
                    {isLoading && (
                      <div className="col-start-1 col-end-12">
                        <LoaderTyping />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )}
              <div className="chat-input-container">
                {showSuccessCard && <div className="overlay active" onClick={handleClose}></div>}
                {showSuccessCard && (
                  <div className="success-card">
                    <img src="/icons/close.svg" className="close-icon" onClick={() => setShowSuccessCard(false)} />
                    <img src="/icons/check.svg" alt="check" className="check-icon" />
                    <h1>¡Guardado con éxito!</h1>
                    <h2>Cambios aplicados</h2>
                  </div>
                )} 
                <TextBox
                  onSendMessages={(msg) => handlePost(msg, showNewIcon)}
                  placeholder="Escribe tu pregunta aquí..."
                  disableCorrection={true}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default WaiseChatPage;