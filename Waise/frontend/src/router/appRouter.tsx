import { Routes, Route, Navigate } from "react-router-dom";

import LoginPages from "../auth/pages/LoginPages";

import WelcomePage from "../presentation/pages/welcome/WelcomePage";
import WaiseChatPage from "../presentation/pages/waisechat/WaiseChatPage";
import DocumentGeneratorPage from "../presentation/pages/document-generator/DocumentGeneratorPage";
import DocumentEditorPage from "../presentation/pages/document-editor/DocumentEditorPage";
import DocumentViewerPage from "../presentation/pages/document-viewer/DocumentViewerPage";
import SavedDocumentsPage from "../presentation/pages/saved-documents/SavedDocumentsPage";
import UploadDocumentsPage from "../presentation/pages/upload-documents/UploadDocumentsPage";



import ProtectedRoute from "../utils/ProtectedRoute"; 



import { useAuth0 } from '@auth0/auth0-react';

const HomeRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Cargando...</div>;
  
  return isAuthenticated 
    ? <Navigate to="/2Marval/waisechat" replace /> 
    : <Navigate to="/2Marval/welcome" replace />;
};

export const AppRouter = () => {
  return (
    <Routes>
      {/* Ruta raíz - redirección condicional */}
      <Route path="/" element={<HomeRedirect />} />
      
      {/* Resto de tus rutas */}
      <Route path="/2Marval/welcome" element={<WelcomePage />} />
      <Route path="/2Marval/login" element={<LoginPages />} />
      <Route 
        path="/2Marval/waisechat" 
        element={<ProtectedRoute><WaiseChatPage /></ProtectedRoute>} 
      />
      <Route 
        path="/2Marval/document-generator" 
        element={<ProtectedRoute><DocumentGeneratorPage /></ProtectedRoute>} 
      />
      <Route 
        path="/2Marval/document-editor" 
        element={<ProtectedRoute><DocumentEditorPage /></ProtectedRoute>} 
      />
      <Route 
        path="/2Marval/document-viewer" 
        element={<ProtectedRoute><DocumentViewerPage /></ProtectedRoute>} 
      />
      <Route 
        path="/2Marval/saved-documents" 
        element={<ProtectedRoute><SavedDocumentsPage /></ProtectedRoute>} 
      />
      <Route 
        path="/2Marval/upload-documents" 
        element={<ProtectedRoute><UploadDocumentsPage /></ProtectedRoute>} 
      />
      
      <Route path="*" element={<Navigate to="/2Marval/welcome" replace />} />
    </Routes>
  );
};