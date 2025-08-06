import React from 'react';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  showBackArrow?: boolean;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ 
  title, 
  subtitle, 
  onClose, 
  onBack, 
  showBackArrow = false 
}) => {
  return (
    <div className="modal-header">
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {showBackArrow && onBack && (
          <button className="modal-back-btn" onClick={onBack}>
            ←
          </button>
        )}
        <div>
          <h2 className="modal-title">{title}</h2>
          {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        </div>
      </div>
      <button className="modal-close-btn" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

export default ModalHeader;