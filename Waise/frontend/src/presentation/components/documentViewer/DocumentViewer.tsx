import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface DocumentViewerProps {
  fileUrl: string;
  fileType: string;
  fileName: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  fileUrl, 
  fileType, 
  fileName 
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading document:', error);
    setError('Error al cargar el documento');
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const renderPdfViewer = () => (
    <div className="pdf-viewer">
      <div className="pdf-controls mb-4 flex items-center justify-between bg-gray-100 p-3 rounded">
        <div className="flex items-center space-x-4">
          <button 
            onClick={goToPrevPage} 
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            ← Anterior
          </button>
          <span className="text-sm">
            Página {pageNumber} de {numPages}
          </span>
          <button 
            onClick={goToNextPage} 
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Siguiente →
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {fileName}
        </div>
      </div>
      
      <div className="pdf-document border rounded overflow-auto max-h-[70vh]">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Cargando documento...</span>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="max-w-full"
          />
        </Document>
      </div>
    </div>
  );

  const renderImageViewer = () => (
    <div className="image-viewer">
      <div className="mb-4 bg-gray-100 p-3 rounded">
        <div className="text-sm text-gray-600">{fileName}</div>
      </div>
      <div className="border rounded overflow-auto max-h-[70vh] flex justify-center">
        <img 
          src={fileUrl} 
          alt={fileName}
          className="max-w-full h-auto"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Error al cargar la imagen');
            setLoading(false);
          }}
        />
      </div>
    </div>
  );

  const renderTextViewer = () => (
    <div className="text-viewer">
      <div className="mb-4 bg-gray-100 p-3 rounded">
        <div className="text-sm text-gray-600">{fileName}</div>
      </div>
      <div className="border rounded p-4 max-h-[70vh] overflow-auto">
        <iframe 
          src={fileUrl}
          className="w-full h-96 border-none"
          title={fileName}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Error al cargar el archivo');
            setLoading(false);
          }}
        />
      </div>
    </div>
  );

  const renderVideoViewer = () => (
    <div className="video-viewer">
      <div className="mb-4 bg-gray-100 p-3 rounded">
        <div className="text-sm text-gray-600">{fileName}</div>
      </div>
      <div className="border rounded overflow-hidden">
        <video 
          controls 
          className="w-full max-h-[70vh]"
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setError('Error al cargar el video');
            setLoading(false);
          }}
        >
          <source src={fileUrl} type={`video/${fileType}`} />
          Tu navegador no soporta el elemento video.
        </video>
      </div>
    </div>
  );

  const renderAudioViewer = () => (
    <div className="audio-viewer">
      <div className="mb-4 bg-gray-100 p-3 rounded">
        <div className="text-sm text-gray-600">{fileName}</div>
      </div>
      <div className="border rounded p-4">
        <audio 
          controls 
          className="w-full"
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setError('Error al cargar el audio');
            setLoading(false);
          }}
        >
          <source src={fileUrl} type={`audio/${fileType}`} />
          Tu navegador no soporta el elemento audio.
        </audio>
      </div>
    </div>
  );

  const renderUnsupportedViewer = () => (
    <div className="unsupported-viewer text-center p-8">
      <div className="mb-4 bg-yellow-100 p-3 rounded">
        <div className="text-sm text-yellow-700">
          Vista previa no disponible para este tipo de archivo: {fileType}
        </div>
        <div className="text-sm text-gray-600 mt-1">{fileName}</div>
      </div>
      <p className="text-gray-600 mb-4">
        Este tipo de archivo no se puede visualizar directamente.
      </p>
      <a 
        href={fileUrl} 
        download={fileName}
        className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Descargar archivo
      </a>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Cargando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="mb-4 bg-red-100 p-3 rounded">
          <div className="text-red-700">{error}</div>
        </div>
        <a 
          href={fileUrl} 
          download={fileName}
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Descargar archivo
        </a>
      </div>
    );
  }

  // Determine which viewer to render based on file type
  const lowerFileType = fileType.toLowerCase();
  
  if (lowerFileType === 'pdf') {
    return renderPdfViewer();
  }
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(lowerFileType)) {
    return renderImageViewer();
  }
  
  if (['txt', 'html', 'json', 'xml', 'css', 'js', 'md'].includes(lowerFileType)) {
    return renderTextViewer();
  }
  
  if (['mp4', 'webm', 'ogg'].includes(lowerFileType)) {
    return renderVideoViewer();
  }
  
  if (['mp3', 'wav', 'ogg'].includes(lowerFileType)) {
    return renderAudioViewer();
  }
  
  return renderUnsupportedViewer();
};