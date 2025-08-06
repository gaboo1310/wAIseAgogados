import React from 'react';
import Modal from './Modal';

interface SuccessModalProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  isVisible, 
  onClose, 
  message = "Operación completada exitosamente" 
}) => {
  return (
    <Modal isVisible={isVisible} onClose={onClose}>
      <div style={{ 
        textAlign: 'center', 
        padding: '20px 0' 
      }}>
        <div style={{ 
          fontSize: '48px', 
          color: '#16a34a', 
          marginBottom: '16px' 
        }}>
          ✓
        </div>
        
        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          color: '#374151',
          margin: '0 0 8px 0'
        }}>
          ¡Éxito!
        </h3>
        
        <p style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          margin: '0 0 24px 0'
        }}>
          {message}
        </p>
        
        <button 
          className="modal-btn modal-btn-primary" 
          onClick={onClose}
          style={{ minWidth: '100px' }}
        >
          Continuar
        </button>
      </div>
    </Modal>
  );
};

export default SuccessModal;