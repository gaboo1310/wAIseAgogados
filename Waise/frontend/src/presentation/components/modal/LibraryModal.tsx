import React from 'react';
import Modal from './Modal';
import ModalHeader from './ModalHeader';
import PageItem from '../pageSection/PageItem';
import { preloadedPages } from '../../pages/waisechat/sectionUtils';
import { ClickedButtons } from '../../../hooks/useLibrarySelection';

interface LibraryModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPageClick: (pageIndex: number) => void;
  onTickClick: (pageIndex: number) => void;
  clickedButtons: ClickedButtons;
  onOpenSections: () => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({
  isVisible,
  onClose,
  onPageClick,
  onTickClick,
  clickedButtons,
  onOpenSections
}) => {
  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <ModalHeader 
        title="Biblioteca Legal" 
        subtitle="Selecciona las páginas y secciones relevantes"
        onClose={onClose}
      />
      
      <div className="modal-body">
        <div className="library-pages-grid">
          {preloadedPages.map((page, pageIndex) => (
            <PageItem
              key={pageIndex}
              pageIndex={pageIndex}
              pageTitle={page.title}
              pageIcon={page.icon}
              sections={page.sections}
              onPageClick={onPageClick}
              onTickClick={onTickClick}
              isClicked={!!clickedButtons[pageIndex]}
            />
          ))}
        </div>
      </div>

      <div className="modal-footer">
        <button 
          className="modal-btn modal-btn-secondary" 
          onClick={onClose}
        >
          Cancelar
        </button>
        <button 
          className="modal-btn modal-btn-primary" 
          onClick={onOpenSections}
        >
          Siguiente
        </button>
      </div>
    </Modal>
  );
};

export default LibraryModal;