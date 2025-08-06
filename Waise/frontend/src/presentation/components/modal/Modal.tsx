import React from 'react';
import './Modal.css';

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ isVisible, onClose, children, className = '' }) => {
  if (!isVisible) return null;

  return (
    <>
      <div className="overlay active" onClick={onClose}></div>
      <div className={`modal-content ${className}`}>
        {children}
      </div>
    </>
  );
};

export default Modal;