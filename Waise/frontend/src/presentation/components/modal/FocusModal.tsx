import React from 'react';
import Modal from './Modal';
import ModalHeader from './ModalHeader';

interface FocusModalProps {
  isVisible: boolean;
  focusValue: string;
  onFocusChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  showBackArrow?: boolean;
  onBack?: () => void;
}

const FocusModal: React.FC<FocusModalProps> = ({
  isVisible,
  focusValue,
  onFocusChange,
  onSave,
  onClose,
  showBackArrow = false,
  onBack
}) => {
  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <ModalHeader 
        title="Focusing" 
        subtitle="Personaliza el enfoque de wAIse"
        onClose={onClose}
        onBack={onBack}
        showBackArrow={showBackArrow}
      />
      
      <div className="modal-body">
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#374151'
          }}>
            Enfoque personalizado:
          </label>
          <textarea
            value={focusValue}
            onChange={(e) => onFocusChange(e.target.value)}
            placeholder="Describe el enfoque que quieres que tenga wAIse en sus respuestas..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#16a34a'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
        </div>
        
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          marginBottom: '20px'
        }}>
          Este enfoque se aplicará a todas las conversaciones futuras con wAIse.
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
          onClick={onSave}
        >
          Guardar
        </button>
      </div>
    </Modal>
  );
};

export default FocusModal;