import { useState, useCallback, useEffect, useRef } from 'react';

interface UseUIStateReturn {
  isSidebarVisible: boolean;
  showBar: boolean;
  showBarSettings: boolean;
  showNewIcon: boolean;
  
  setIsSidebarVisible: (visible: boolean) => void;
  setShowBar: (show: boolean) => void;
  setShowBarSettings: (show: boolean) => void;
  setShowNewIcon: (show: boolean) => void;
  
  toggleSidebar: () => void;
  handleClick: () => void;
  handleClickOutside: (event: MouseEvent) => void;
}

export const useUIState = (): UseUIStateReturn => {
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [showBar, setShowBar] = useState<boolean>(false);
  const [showBarSettings, setShowBarSettings] = useState<boolean>(false);
  const [showNewIcon, setShowNewIcon] = useState<boolean>(false);
  
  const barRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible(prev => !prev);
  }, []);

  const handleClick = useCallback(() => {
    setShowBar(prev => !prev);
    setShowBarSettings(prev => !prev);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (barRef.current && !barRef.current.contains(event.target as Node)) {
      setShowBar(false);
      setShowBarSettings(false);
    }
  }, []);

  useEffect(() => {
    if (showBar) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBar, handleClickOutside]);

  return {
    isSidebarVisible,
    showBar,
    showBarSettings,
    showNewIcon,
    setIsSidebarVisible,
    setShowBar,
    setShowBarSettings,
    setShowNewIcon,
    toggleSidebar,
    handleClick,
    handleClickOutside
  };
};