import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './DocumentViewer.css';

interface SimpleDocumentViewerProps {
  filePath: string;
  fileName: string;
  fileType: string;
  onError?: (error: string) => void;
}

export const SimpleDocumentViewer: React.FC<SimpleDocumentViewerProps> = ({ 
  filePath, 
  fileName, 
  fileType,
  onError 
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const getFileContent = async () => {
      try {
        console.log('🔗 Getting file content for:', filePath);
        
        const token = await getAccessTokenSilently();
        
        // First try to get a signed URL for S3 files
        try {
          const urlResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/uploads/signed-url/${encodeURIComponent(filePath)}`, 
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (urlResponse.ok) {
            const data = await urlResponse.json();
            console.log('✅ Signed URL received:', data.url);
            
            // Check if it's a relative URL (local storage)
            if (data.url.startsWith('/api/') || data.url.startsWith('http://localhost')) {
              // For local storage, fetch the file content and create a blob URL for inline viewing
              const fileResponse = await fetch(data.url, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (!fileResponse.ok) {
                throw new Error('Error fetching file content');
              }
              
              const blob = await fileResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              setSignedUrl(blobUrl);
            } else {
              // For S3, use the signed URL directly
              setSignedUrl(data.url);
            }
            
            setLoading(false);
            return;
          }
        } catch (urlError) {
          console.log('⚠️ Signed URL approach failed, trying direct download:', urlError);
        }
        
        // Fallback: Direct view approach
        const viewResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/uploads/view/${encodeURIComponent(filePath)}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!viewResponse.ok) {
          throw new Error('Error viewing file');
        }

        const blob = await viewResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ File blob URL created for viewing');
        setSignedUrl(blobUrl);
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Error getting file content:', error);
        const errorMsg = 'Error cargando el archivo';
        setError(errorMsg);
        setLoading(false);
        onError?.(errorMsg);
      }
    };

    getFileContent();
    
    // Cleanup blob URL when component unmounts
    return () => {
      if (signedUrl && signedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(signedUrl);
      }
    };
  }, [filePath, getAccessTokenSilently, onError]);

  const renderViewer = () => {
    if (!signedUrl) return null;

    const lowerFileType = fileType.toLowerCase();
    
    // PDF Files
    if (lowerFileType === 'pdf') {
      return (
        <div className="pdf-viewer-container">
          <div className="viewer-options">
            <h4>Opciones de visualización:</h4>
            <div className="viewer-buttons">
              <button 
                className="viewer-option-button"
                onClick={() => window.open(signedUrl, '_blank')}
              >
                🔗 Abrir en nueva pestaña
              </button>
              <button 
                className="viewer-option-button"
                onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`, '_blank')}
              >
                📖 Ver con Google Docs
              </button>
            </div>
          </div>
          
          {/* Try to embed PDF directly */}
          <div className="pdf-embed-container">
            <embed
              src={signedUrl}
              type="application/pdf"
              width="100%"
              height="600px"
              style={{ border: 'none', borderRadius: '8px' }}
            />
          </div>
        </div>
      );
    }
    
    // Image Files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(lowerFileType)) {
      return (
        <div className="image-viewer-container">
          <img 
            src={signedUrl} 
            alt={fileName}
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onError={() => {
              setError('Error cargando la imagen');
              onError?.('Error cargando la imagen');
            }}
          />
        </div>
      );
    }
    
    // Text Files
    if (['txt', 'json', 'xml', 'css', 'js', 'html'].includes(lowerFileType)) {
      return (
        <div className="text-viewer-container">
          <iframe 
            src={signedUrl}
            style={{ 
              width: '100%', 
              height: '500px', 
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}
            title={fileName}
          />
        </div>
      );
    }
    
    // Video Files
    if (['mp4', 'webm', 'ogg'].includes(lowerFileType)) {
      return (
        <div className="video-viewer-container">
          <video 
            controls 
            style={{ 
              width: '100%', 
              maxHeight: '500px',
              borderRadius: '8px'
            }}
          >
            <source src={signedUrl} type={`video/${lowerFileType}`} />
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>
      );
    }
    
    // Audio Files
    if (['mp3', 'wav', 'ogg'].includes(lowerFileType)) {
      return (
        <div className="audio-viewer-container">
          <audio 
            controls 
            style={{ width: '100%' }}
          >
            <source src={signedUrl} type={`audio/${lowerFileType}`} />
            Tu navegador no soporta la reproducción de audio.
          </audio>
        </div>
      );
    }
    
    // Microsoft Office Files
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(lowerFileType)) {
      return (
        <div className="office-viewer-container">
          <div className="viewer-options">
            <h4>Documento de Office detectado:</h4>
            <div className="viewer-buttons">
              <button 
                className="viewer-option-button"
                onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`, '_blank')}
              >
                📖 Ver con Google Docs
              </button>
              <button 
                className="viewer-option-button"
                onClick={() => window.open(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`, '_blank')}
              >
                📄 Ver con Office Online
              </button>
              <button 
                className="viewer-option-button"
                onClick={() => window.open(signedUrl, '_blank')}
              >
                📥 Descargar archivo
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Default: Unsupported file type
    return (
      <div className="unsupported-viewer">
        <div className="unsupported-content">
          <h3>📄 {fileName}</h3>
          <p>Vista previa no disponible para archivos .{lowerFileType}</p>
          <div className="viewer-buttons">
            <button 
              className="viewer-option-button"
              onClick={() => window.open(signedUrl, '_blank')}
            >
              🔗 Abrir en nueva pestaña
            </button>
            <button 
              className="viewer-option-button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = signedUrl;
                a.download = fileName;
                a.click();
              }}
            >
              📥 Descargar archivo
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Preparando vista previa...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>❌ Error</h3>
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="simple-document-viewer">
      <div className="viewer-header">
        <h3>📄 {fileName}</h3>
        <span className="file-type-badge">.{fileType.toUpperCase()}</span>
      </div>
      
      <div className="viewer-content">
        {renderViewer()}
      </div>
    </div>
  );
};