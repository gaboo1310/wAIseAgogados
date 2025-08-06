import { useState, useCallback } from 'react';

interface UseModalStateReturn {
  showLibraryCard: boolean;
  showFocusingCard: boolean;
  showSectionsCard: boolean;
  showSubsectionCard: boolean;
  showSuccessCard: boolean;
  showBackArrow: boolean;
  
  setLibraryCard: (show: boolean) => void;
  setFocusingCard: (show: boolean) => void;
  setShowSectionsCard: (show: boolean) => void;
  setShowSubsectionCard: (show: boolean) => void;
  setShowSuccessCard: (show: boolean) => void;
  setShowBackArrow: (show: boolean) => void;
  
  openLibraryModal: () => void;
  openFocusModal: () => void;
  openSectionsModal: () => void;
  openSubsectionModal: () => void;
  openSuccessModal: () => void;
  closeAllModals: () => void;
  
  handleClose: () => void;
  handleBackClick: () => void;
}

export const useModalState = (): UseModalStateReturn => {
  const [showLibraryCard, setLibraryCard] = useState<boolean>(false);
  const [showFocusingCard, setFocusingCard] = useState<boolean>(false);
  const [showSectionsCard, setShowSectionsCard] = useState<boolean>(false);
  const [showSubsectionCard, setShowSubsectionCard] = useState<boolean>(false);
  const [showSuccessCard, setShowSuccessCard] = useState<boolean>(false);
  const [showBackArrow, setShowBackArrow] = useState<boolean>(false);

  const closeAllModals = useCallback(() => {
    setLibraryCard(false);
    setFocusingCard(false);
    setShowSectionsCard(false);
    setShowSubsectionCard(false);
    setShowSuccessCard(false);
    setShowBackArrow(false);
  }, []);

  const openLibraryModal = useCallback(() => {
    closeAllModals();
    setLibraryCard(true);
  }, [closeAllModals]);

  const openFocusModal = useCallback(() => {
    closeAllModals();
    setFocusingCard(true);
  }, [closeAllModals]);

  const openSectionsModal = useCallback(() => {
    setLibraryCard(false);
    setShowSectionsCard(true);
    setShowBackArrow(true);
  }, []);

  const openSubsectionModal = useCallback(() => {
    setShowSectionsCard(false);
    setShowSubsectionCard(true);
    setShowBackArrow(true);
  }, []);

  const openSuccessModal = useCallback(() => {
    closeAllModals();
    setShowSuccessCard(true);
  }, [closeAllModals]);

  const handleClose = useCallback(() => {
    closeAllModals();
  }, [closeAllModals]);

  const handleBackClick = useCallback(() => {
    if (showSubsectionCard) {
      setShowSubsectionCard(false);
      setShowSectionsCard(true);
    } else if (showSectionsCard) {
      setShowSectionsCard(false);
      setLibraryCard(true);
      setShowBackArrow(false);
    } else if (showFocusingCard) {
      setFocusingCard(false);
      setShowBackArrow(false);
    }
  }, [showSubsectionCard, showSectionsCard, showFocusingCard]);

  return {
    showLibraryCard,
    showFocusingCard,
    showSectionsCard,
    showSubsectionCard,
    showSuccessCard,
    showBackArrow,
    setLibraryCard,
    setFocusingCard,
    setShowSectionsCard,
    setShowSubsectionCard,
    setShowSuccessCard,
    setShowBackArrow,
    openLibraryModal,
    openFocusModal,
    openSectionsModal,
    openSubsectionModal,
    openSuccessModal,
    closeAllModals,
    handleClose,
    handleBackClick
  };
};