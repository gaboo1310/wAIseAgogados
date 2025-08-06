import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import OCRUploadComponent from '../../components/ocr-upload/OCRUploadComponent';
import './OCRDocumentsPage.css';

interface ProcessedDocument {
  id: string;
  filename: string;
  documentType: string;
  status: string;
  isProcessed: boolean;
  ocrConfidence: number;
  pageCount: number;
  fileSize: number;
  uploadDate: string;
  applicableTemplates: string[];
  isSelectedForTemplate: boolean;
  extractedFields: any;
}

interface OCRResult {
  success: boolean;
  extractedText: string;
  confidence: number;
  filename: string;
  fileSize: number;
  metadata?: {
    pageCount: number;
    processingTime: number;
  };
  error?: string;
}

const OCRDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/document-metadata/my-documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error('Error loading documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/document-metadata/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleOCRComplete = (result: OCRResult) => {
    console.log('OCR completed:', result);
    // Recargar documentos después de unos segundos para mostrar el nuevo
    setTimeout(() => {
      loadDocuments();
      loadStats();
    }, 2000);
  };

  const handleDocumentUploaded = (documentId: string) => {
    console.log('Document uploaded with ID:', documentId);
    // Recargar inmediatamente para mostrar el documento en procesamiento
    loadDocuments();
    loadStats();
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/document-metadata/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setDocuments(docs => docs.filter(doc => doc.id !== documentId));
        loadStats();
      } else {
        alert('Error al eliminar el documento');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    }
  };

  const handleToggleSelection = async (documentId: string, currentState: boolean) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/document-metadata/${documentId}/select`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isSelected: !currentState,
        }),
      });

      if (response.ok) {
        setDocuments(docs => docs.map(doc => 
          doc.id === documentId 
            ? { ...doc, isSelectedForTemplate: !currentState }
            : doc
        ));
      } else {
        alert('Error al actualizar la selección');
      }
    } catch (error) {
      console.error('Error toggling selection:', error);
      alert('Error al actualizar la selección');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDocuments();
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/document-metadata/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error searching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (selectedType === 'all') return true;
    return doc.documentType === selectedType;
  });

  const getStatusIcon = (status: string, isProcessed: boolean) => {
    if (status === 'error') return '❌';
    if (status === 'processing' || !isProcessed) return '⏳';
    if (status === 'completed' && isProcessed) return '✅';
    return '📄';
  };

  const getStatusText = (status: string, isProcessed: boolean) => {
    if (status === 'error') return 'Error';
    if (status === 'processing' || !isProcessed) return 'Procesando';
    if (status === 'completed' && isProcessed) return 'Completado';
    return 'Subido';
  };

  const getDocumentTypeLabel = (type: string) => {
    const types = {
      contract: 'Contrato',
      invoice: 'Factura',
      legal_brief: 'Escrito Legal',
      evidence: 'Evidencia',
      court_document: 'Documento Judicial',
      other: 'Otro',
    };
    return types[type as keyof typeof types] || type;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="ocr-documents-page">
      <div className="page-header">
        <div className="header-top">
          <button className="back-button" onClick={() => navigate('/waisechat')}>
            ← Volver al Chat
          </button>
          <h1>📄 Procesamiento de Documentos OCR</h1>
        </div>
        
        {stats && (
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.processed}</span>
              <span className="stat-label">Procesados</span>
            </div>
            <div className="stat">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pendientes</span>
            </div>
            {stats.errors > 0 && (
              <div className="stat error">
                <span className="stat-value">{stats.errors}</span>
                <span className="stat-label">Errores</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="page-content">
        <div className="upload-section">
          <h2>🚀 Subir Nuevo Documento</h2>
          <OCRUploadComponent
            onOCRComplete={handleOCRComplete}
            onDocumentUploaded={handleDocumentUploaded}
            buttonText="Subir y Procesar con OCR"
            showExtractOnly={false}
          />
        </div>

        <div className="documents-section">
          <div className="section-header">
            <h2>📋 Documentos Procesados</h2>
            
            <div className="controls">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar documentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch}>🔍</button>
              </div>

              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="type-filter"
              >
                <option value="all">Todos los tipos</option>
                <option value="contract">Contratos</option>
                <option value="invoice">Facturas</option>
                <option value="legal_brief">Escritos Legales</option>
                <option value="evidence">Evidencia</option>
                <option value="court_document">Documentos Judiciales</option>
                <option value="other">Otros</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <span>Cargando documentos...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📄</span>
              <p>No hay documentos {searchQuery ? 'que coincidan con la búsqueda' : 'procesados aún'}</p>
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); loadDocuments(); }}>
                  Mostrar todos
                </button>
              )}
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="card-header">
                    <div className="document-info">
                      <span className="status-icon">
                        {getStatusIcon(doc.status, doc.isProcessed)}
                      </span>
                      <div>
                        <h3 title={doc.filename}>{doc.filename}</h3>
                        <span className="document-type">
                          {getDocumentTypeLabel(doc.documentType)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-actions">
                      <button
                        className={`select-btn ${doc.isSelectedForTemplate ? 'selected' : ''}`}
                        onClick={() => handleToggleSelection(doc.id, doc.isSelectedForTemplate)}
                        title={doc.isSelectedForTemplate ? 'Deseleccionar para plantillas' : 'Seleccionar para plantillas'}
                      >
                        {doc.isSelectedForTemplate ? '☑️' : '☐'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Eliminar documento"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="card-details">
                    <div className="detail">
                      <span>Estado:</span>
                      <span className={`status ${doc.status}`}>
                        {getStatusText(doc.status, doc.isProcessed)}
                      </span>
                    </div>
                    
                    <div className="detail">
                      <span>Tamaño:</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                    
                    {doc.pageCount > 0 && (
                      <div className="detail">
                        <span>Páginas:</span>
                        <span>{doc.pageCount}</span>
                      </div>
                    )}
                    
                    {doc.ocrConfidence > 0 && (
                      <div className="detail">
                        <span>Confianza OCR:</span>
                        <span className={`confidence ${doc.ocrConfidence >= 0.8 ? 'high' : doc.ocrConfidence >= 0.6 ? 'medium' : 'low'}`}>
                          {(doc.ocrConfidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                    
                    <div className="detail">
                      <span>Fecha:</span>
                      <span>{formatDate(doc.uploadDate)}</span>
                    </div>
                  </div>

                  {doc.applicableTemplates && doc.applicableTemplates.length > 0 && (
                    <div className="applicable-templates">
                      <span>Plantillas aplicables:</span>
                      <div className="templates">
                        {doc.applicableTemplates.slice(0, 3).map((template, idx) => (
                          <span key={idx} className="template-tag">
                            {template}
                          </span>
                        ))}
                        {doc.applicableTemplates.length > 3 && (
                          <span className="more-templates">
                            +{doc.applicableTemplates.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {doc.extractedFields && Object.keys(doc.extractedFields).length > 0 && (
                    <div className="extracted-fields">
                      <span>Campos extraídos:</span>
                      <div className="fields">
                        {Object.keys(doc.extractedFields).slice(0, 3).map((field) => (
                          <span key={field} className="field-tag">
                            {field}
                          </span>
                        ))}
                        {Object.keys(doc.extractedFields).length > 3 && (
                          <span className="more-fields">
                            +{Object.keys(doc.extractedFields).length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRDocumentsPage;