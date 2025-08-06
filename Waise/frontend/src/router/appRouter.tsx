import { Routes, Route, Navigate } from "react-router-dom";

import LoginPages from "../auth/pages/LoginPages";

import WelcomePage from "../presentation/pages/welcome/WelcomePage";
import WaiseChatPage from "../presentation/pages/waisechat/WaiseChatPage";
import DocumentGeneratorPage from "../presentation/pages/document-generator/DocumentGeneratorPage";
import DocumentEditorPage from "../presentation/pages/document-editor/DocumentEditorPage";
import DocumentViewerPage from "../presentation/pages/document-viewer/DocumentViewerPage";
import SavedDocumentsPage from "../presentation/pages/saved-documents/SavedDocumentsPage";
import UploadDocumentsPage from "../presentation/pages/upload-documents/UploadDocumentsPage";
import OCRDocumentsPage from "../presentation/pages/ocr-documents/OCRDocumentsPage";



import ProtectedRoute from "../utils/ProtectedRoute"; 



import { useAuth0 } from '@auth0/auth0-react';

const HomeRedirect = () => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading) return <div>Cargando...</div>;
  
  if (isAuthenticated && user) {
    return <Navigate to="/waisechat" replace />;
  }
  
  return <Navigate to="/welcome" replace />;
};

export const AppRouter = () => {
  return (
    <Routes>
      {/* Ruta raíz - redirección condicional */}
      <Route path="/" element={<HomeRedirect />} />
      
      {/* Resto de tus rutas */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPages />} />
      <Route 
        path="/waisechat" 
        element={<ProtectedRoute><WaiseChatPage /></ProtectedRoute>} 
      />
      <Route 
        path="/document-generator" 
        element={<ProtectedRoute><DocumentGeneratorPage /></ProtectedRoute>} 
      />
      <Route 
        path="/document-editor" 
        element={<ProtectedRoute><DocumentEditorPage /></ProtectedRoute>} 
      />
      <Route 
        path="/document-viewer" 
        element={<ProtectedRoute><DocumentViewerPage /></ProtectedRoute>} 
      />
      <Route 
        path="/saved-documents" 
        element={<ProtectedRoute><SavedDocumentsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/upload-documents" 
        element={<ProtectedRoute><UploadDocumentsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/ocr-documents" 
        element={<ProtectedRoute><OCRDocumentsPage /></ProtectedRoute>} 
      />
      
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
};