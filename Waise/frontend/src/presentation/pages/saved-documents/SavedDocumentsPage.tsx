import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './savedDocuments.css';

interface DocumentMetadata {
  id: string;
  title: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  size: number;
}

interface SavedDocument {
  id: string;
  title: string;
  content: string;
  templateId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

const SavedDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [localDocuments, setLocalDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'cloud') {
        await loadCloudDocuments();
      } else {
        loadLocalDocuments();
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Error cargando los documentos');
    } finally {
      setLoading(false);
    }
  };

  const loadCloudDocuments = async () => {
    try {
      console.log('🔍 Loading cloud documents with Auth0...');
      const token = await getAccessTokenSilently();
      console.log('Token obtained for list:', token ? 'YES ✅' : 'NO ❌');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('List response error:', response.status, errorText);
        throw new Error('Error obteniendo documentos de la nube');
      }

      const data = await response.json();
      console.log('📋 Cloud documents loaded:', data);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading cloud documents:', error);
      throw error;
    }
  };

  const loadLocalDocuments = () => {
    const saved = localStorage.getItem('savedDocuments');
    if (saved) {
      const docs = JSON.parse(saved);
      setLocalDocuments(docs);
    } else {
      setLocalDocuments([]);
    }
  };

  const openDocument = async (documentId: string, isLocal: boolean = false) => {
    try {
      if (isLocal) {
        // Abrir documento local
        const document = localDocuments.find(doc => doc.id === documentId);
        if (document) {
          navigate('/document-editor', {
            state: {
              document: document,
              isEditing: true
            }
          });
        }
      } else {
        // Abrir documento de la nube
        console.log('📖 Opening cloud document:', documentId);
        const token = await getAccessTokenSilently();
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error obteniendo el documento');
        }

        const document = await response.json();
        console.log('📄 Document loaded:', document);
        navigate('/document-editor', {
          state: {
            document: document,
            isEditing: true
          }
        });
      }
    } catch (error) {
      console.error('Error opening document:', error);
      setError('Error abriendo el documento');
    }
  };

  const deleteDocument = async (documentId: string, isLocal: boolean = false) => {
    setDeleteLoading(true);
    
    try {
      if (isLocal) {
        // Eliminar documento local
        const updatedDocs = localDocuments.filter(doc => doc.id !== documentId);
        setLocalDocuments(updatedDocs);
        localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
      } else {
        // Eliminar documento de la nube
        console.log('🗑️ Deleting cloud document:', documentId);
        
        try {
          const token = await getAccessTokenSilently();
          const deleteUrl = `${import.meta.env.VITE_API_URL}/documents/${documentId}`;
          console.log('🔗 Delete document URL:', deleteUrl);
          
          const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('📡 Delete response status:', response.status);
          console.log('📡 Delete response ok:', response.ok);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Delete document error:', response.status, errorText);
            throw new Error(`Error eliminando documento: ${response.status}`);
          }

          const result = await response.json();
          console.log('✅ Document deleted successfully:', result);
          
        } catch (error) {
          console.error('❌ Error deleting cloud document:', error);
          setError('Error eliminando el documento de la nube');
          return; // Don't reload if deletion failed
        }
        
        // Recargar documentos solo si la eliminación fue exitosa
        await loadCloudDocuments();
      }
      
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Error eliminando el documento');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = (documentId: string) => {
    setDocumentToDelete(documentId);
    setShowDeleteModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  return (
    <div className="saved-documents-page">
      {/* Header */}
      <header className="saved-docs-header">
        <button 
          className="back-button"
          onClick={() => navigate('/waisechat')}
        >
          ← Volver al Chat
        </button>
        
        <h1>📁 Archivos Guardados</h1>
        
        <div className="header-tabs">
          <button 
            className={`tab-button ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            ☁️ En la Nube
          </button>
          <button 
            className={`tab-button ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            💾 Local
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="saved-docs-content">
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button onClick={loadDocuments}>Reintentar</button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando documentos...</p>
          </div>
        ) : (
          <div className="documents-grid">
            {activeTab === 'cloud' ? (
              documents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <h3>No hay documentos en la nube</h3>
                  <p>Los documentos guardados en la nube aparecerán aquí</p>
                  <button 
                    className="create-button"
                    onClick={() => navigate('/document-generator')}
                  >
                    Crear Nuevo Documento
                  </button>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <div className="document-header">
                      <div className="document-icon">📄</div>
                      <div className="document-actions">
                        <button 
                          className="action-button edit"
                          onClick={() => openDocument(doc.id, false)}
                          title="Abrir documento"
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-button delete"
                          onClick={() => confirmDelete(doc.id)}
                          title="Eliminar documento"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="document-info">
                      <h3>{doc.title}</h3>
                      {doc.templateName && (
                        <span className="template-badge">{doc.templateName}</span>
                      )}
                      <div className="document-meta">
                        <p>Creado: {formatDate(doc.createdAt)}</p>
                        <p>Modificado: {formatDate(doc.updatedAt)}</p>
                        <p>Tamaño: {formatFileSize(doc.size)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              localDocuments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💾</div>
                  <h3>No hay documentos locales</h3>
                  <p>Los documentos guardados localmente aparecerán aquí</p>
                  <button 
                    className="create-button"
                    onClick={() => navigate('/document-generator')}
                  >
                    Crear Nuevo Documento
                  </button>
                </div>
              ) : (
                localDocuments.map((doc) => (
                  <div key={doc.id} className="document-card">
                    <div className="document-header">
                      <div className="document-icon">📄</div>
                      <div className="document-actions">
                        <button 
                          className="action-button edit"
                          onClick={() => openDocument(doc.id, true)}
                          title="Abrir documento"
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-button delete"
                          onClick={() => confirmDelete(doc.id + '_local')}
                          title="Eliminar documento"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="document-info">
                      <h3>{doc.title}</h3>
                      {doc.templateName && (
                        <span className="template-badge">{doc.templateName}</span>
                      )}
                      <div className="document-meta">
                        <p>Creado: {formatDate(doc.createdAt)}</p>
                        <p>Modificado: {formatDate(doc.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}></div>
          <div className="delete-modal">
            <div className="modal-header">
              <h3>Confirmar Eliminación</h3>
              {!deleteLoading && (
                <button 
                  className="close-modal-button"
                  onClick={() => setShowDeleteModal(false)}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="modal-content">
              <p>¿Estás seguro de que quieres eliminar este documento?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button 
                  className="confirm-delete-button"
                  onClick={() => deleteDocument(
                    documentToDelete?.includes('_local') 
                      ? documentToDelete.replace('_local', '')
                      : documentToDelete!, 
                    documentToDelete?.includes('_local')
                  )}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SavedDocumentsPage;