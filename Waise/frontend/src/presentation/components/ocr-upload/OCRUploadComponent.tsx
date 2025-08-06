import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './OCRUploadComponent.css';

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

interface OCRUploadComponentProps {
  onOCRComplete?: (result: OCRResult) => void;
  onDocumentUploaded?: (documentId: string) => void;
  accept?: string;
  maxSize?: number;
  buttonText?: string;
  showExtractOnly?: boolean; // Si true, solo extrae texto. Si false, sube y procesa
}

const OCRUploadComponent: React.FC<OCRUploadComponentProps> = ({
  onOCRComplete,
  onDocumentUploaded,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp',
  maxSize = 50 * 1024 * 1024, // 50MB
  buttonText = 'Subir y Procesar Documento',
  showExtractOnly = false,
}) => {
  const { getAccessTokenSilently } = useAuth0();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande. Máximo ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    // Validar tipo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Solo se permiten PDF e imágenes.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);

    try {
      const token = await getAccessTokenSilently();

      if (showExtractOnly) {
        // Solo extraer texto (OCR directo)
        await processOCROnly(file, token);
      } else {
        // Subir documento completo con procesamiento
        await uploadAndProcessDocument(file, token);
      }

    } catch (error) {
      console.error('Error processing file:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar el archivo');
    } finally {
      setIsProcessing(false);
      // Limpiar input
      event.target.value = '';
    }
  };

  const processOCROnly = async (file: File, token: string) => {
    const formData = new FormData();
    formData.append('file', file);

    console.log('🔍 Extracting text from:', file.name);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/ocr/extract`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en extracción OCR');
    }

    const ocrResult: OCRResult = await response.json();
    console.log('✅ OCR completed:', {
      filename: ocrResult.filename,
      confidence: ocrResult.confidence,
      textLength: ocrResult.extractedText?.length || 0,
    });

    setResult(ocrResult);
    onOCRComplete?.(ocrResult);
  };

  const uploadAndProcessDocument = async (file: File, token: string) => {
    const formData = new FormData();
    formData.append('file', file);

    console.log('📤 Uploading document for processing:', file.name);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/document-metadata/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al subir documento');
    }

    const uploadResult = await response.json();
    console.log('✅ Document uploaded:', uploadResult);

    // El resultado del upload incluye la información básica
    const ocrResult: OCRResult = {
      success: uploadResult.success,
      extractedText: 'Procesando...', // Se actualizará cuando OCR termine
      confidence: 0,
      filename: uploadResult.document.filename,
      fileSize: uploadResult.document.fileSize,
      metadata: {
        pageCount: 0,
        processingTime: 0,
      },
    };

    setResult(ocrResult);
    onDocumentUploaded?.(uploadResult.document.id);
    
    // Notificar que se completó la carga (OCR puede seguir procesando en background)
    onOCRComplete?.(ocrResult);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#4CAF50'; // Verde
    if (confidence >= 0.6) return '#FF9800'; // Naranja
    return '#F44336'; // Rojo
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Media';
    return 'Baja';
  };

  return (
    <div className="ocr-upload-component">
      <div className="upload-area">
        <input
          type="file"
          id="ocr-file-input"
          accept={accept}
          onChange={handleFileUpload}
          disabled={isProcessing}
          style={{ display: 'none' }}
        />
        
        <label htmlFor="ocr-file-input" className={`upload-button ${isProcessing ? 'processing' : ''}`}>
          {isProcessing ? (
            <>
              <div className="spinner"></div>
              <span>
                {showExtractOnly ? 'Extrayendo texto...' : 'Procesando documento...'}
              </span>
            </>
          ) : (
            <>
              <span className="upload-icon">📄</span>
              <span>{buttonText}</span>
            </>
          )}
        </label>

        <p className="upload-hint">
          Formatos: PDF, JPG, PNG, GIF, WebP | Máximo: {Math.round(maxSize / (1024 * 1024))}MB
        </p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {result && (
        <div className="ocr-result">
          <div className="result-header">
            <h3>
              <span className="result-icon">
                {result.success ? '✅' : '❌'}
              </span>
              Resultado del procesamiento
            </h3>
          </div>

          <div className="result-info">
            <div className="info-row">
              <span className="label">Archivo:</span>
              <span className="value">{result.filename}</span>
            </div>
            
            <div className="info-row">
              <span className="label">Tamaño:</span>
              <span className="value">{formatFileSize(result.fileSize)}</span>
            </div>
            
            {result.metadata && (
              <>
                <div className="info-row">
                  <span className="label">Páginas:</span>
                  <span className="value">{result.metadata.pageCount}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">Tiempo:</span>
                  <span className="value">{result.metadata.processingTime}ms</span>
                </div>
              </>
            )}
            
            {result.success && result.confidence > 0 && (
              <div className="info-row">
                <span className="label">Confianza OCR:</span>
                <span 
                  className="value confidence"
                  style={{ color: getConfidenceColor(result.confidence) }}
                >
                  {(result.confidence * 100).toFixed(0)}% ({getConfidenceLabel(result.confidence)})
                </span>
              </div>
            )}
          </div>

          {result.extractedText && result.extractedText !== 'Procesando...' && (
            <div className="extracted-text">
              <h4>Texto extraído:</h4>
              <div className="text-content">
                {result.extractedText.substring(0, 1000)}
                {result.extractedText.length > 1000 && (
                  <span className="text-truncated">
                    ... ({result.extractedText.length - 1000} caracteres más)
                  </span>
                )}
              </div>
            </div>
          )}

          {result.error && (
            <div className="error-details">
              <h4>Error:</h4>
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRUploadComponent;