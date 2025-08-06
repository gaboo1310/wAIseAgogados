import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { SimpleDocumentViewer } from '../../components/documentViewer/SimpleDocumentViewer';
import './documentViewerPage.css';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  uploadedAt?: string;
  path: string;
}

const DocumentViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const location = useLocation();
  const [file, setFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('📁 DocumentViewer: Loading file from state...', location.state);
    console.log('📁 DocumentViewer: isAuthenticated:', isAuthenticated);
    
    // Only proceed if user is authenticated
    if (!isAuthenticated) {
      console.log('📁 DocumentViewer: User not authenticated, waiting...');
      return;
    }
    
    // Get file info from navigation state
    if (location.state?.file) {
      const fileData = location.state.file;
      console.log('📄 File data:', fileData);
      setFile(fileData);
      setLoading(false);
    } else {
      console.error('❌ No file data in location state');
      setError('No se encontró información del archivo');
      setLoading(false);
      
      // Redirect back to upload documents after a short delay
      setTimeout(() => {
        navigate('/upload-documents', { replace: true });
      }, 2000);
    }
  }, [location.state, navigate, isAuthenticated]);

  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const deleteFile = async () => {
    if (!file) return;
    
    if (!confirm(`¿Estás seguro de que quieres eliminar ${file.name}?`)) {
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/uploads/delete/${encodeURIComponent(file.path)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error eliminando el archivo');
      }

      alert('Archivo eliminado exitosamente');
      navigate('/upload-documents', { replace: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error eliminando el archivo');
    }
  };

  const downloadFile = async () => {
    if (!file) return;

    try {
      const token = await getAccessTokenSilently();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/uploads/download/${encodeURIComponent(file.path)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error descargando el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error descargando el archivo');
    }
  };

  if (loading) {
    return (
      <div className="document-viewer-page" style={{ 
        minHeight: '100vh', 
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="document-viewer-page" style={{ 
        minHeight: '100vh', 
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="error-container" style={{
          textAlign: 'center',
          padding: '40px',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            {error || 'No se pudo cargar el archivo'}
          </p>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>
            Redirigiendo automáticamente...
          </p>
          <button 
            className="back-button"
            onClick={() => navigate('/upload-documents', { replace: true })}
            style={{
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Volver a Documentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-viewer-page">
      {/* Header */}
      <header className="viewer-header">
        <button 
          className="back-button"
          onClick={() => navigate('/upload-documents', { replace: true })}
        >
          ← Volver a Documentos
        </button>
        
        <div className="file-info">
          <h1 className="file-title">{file.name}</h1>
          <div className="file-meta">
            {file.size && (
              <span className="file-size">
                📁 {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
            {file.uploadedAt && (
              <span className="file-date">
                📅 {new Date(file.uploadedAt).toLocaleString('es-ES')}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="action-button download"
            onClick={downloadFile}
            title="Descargar archivo"
          >
            📥 Descargar
          </button>
          <button 
            className="action-button delete"
            onClick={deleteFile}
            title="Eliminar archivo"
          >
            🗑️ Eliminar
          </button>
        </div>
      </header>

      {/* Viewer Content */}
      <div className="viewer-content">
        <SimpleDocumentViewer
          filePath={file.path}
          fileName={file.name}
          fileType={getFileExtension(file.name)}
          onError={(error) => setError(error)}
        />
      </div>
    </div>
  );
};

export default DocumentViewerPage;