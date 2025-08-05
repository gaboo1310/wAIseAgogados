
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import DashboardLayout from "../layouts/DashboardLayout";
// Removed unused page imports - only keeping wAIse chat
import WelcomePage from "../pages/welcome/WelcomePage"
import WaiseChatPage from "../pages/waisechat/WaiseChatPage"
import DocumentGeneratorPage from "../pages/document-generator/DocumentGeneratorPage"
import DocumentEditorPage from "../pages/document-editor/DocumentEditorPage"
import DocumentViewerPage from "../pages/document-viewer/DocumentViewerPage"
import SavedDocumentsPage from "../pages/saved-documents/SavedDocumentsPage"
import UploadDocumentsPage from "../pages/upload-documents/UploadDocumentsPage"
import ProtectedRoute from "../../utils/ProtectedRoute";

// Componente para redireccionar basado en autenticación
const RootRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth0();
  
  if (isLoading) return <div>Cargando...</div>;
  return isAuthenticated 
    ? <Navigate to="/2Marval/waisechat" replace /> 
    : <Navigate to="/2Marval/welcome" replace />;
};

// Menu routes cleaned - only wAIse chat functionality remains
export const menuRoutes: any[] = [];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />
  },
  {
    path: "/2Marval/welcome", // Cambio de ruta
    element: <WelcomePage />
  },
  {
    path: "/2Marval/waisechat", // Cambio de ruta
    element: (
      <ProtectedRoute>
        <WaiseChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/2Marval/document-generator", // Nueva ruta para generador de documentos
    element: (
      <ProtectedRoute>
        <DocumentGeneratorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/2Marval/document-editor", // Nueva ruta para editor de documentos
    element: (
      <ProtectedRoute>
        <DocumentEditorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/2Marval/saved-documents", // Nueva ruta para archivos guardados
    element: (
      <ProtectedRoute>
        <SavedDocumentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/2Marval/upload-documents", // Nueva ruta para subir documentos
    element: (
      <ProtectedRoute>
        <UploadDocumentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/2Marval/document-viewer", // Nueva ruta para visualizar documentos
    element: (
      <ProtectedRoute>
        <DocumentViewerPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/2Marval/dashboard", // Cambio de ruta
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: menuRoutes.map(route => ({
      path: route.to,
      element: route.component
    }))
  },
  {
    path: "*",
    element: <Navigate to="/2Marval/welcome" /> // Cambio de ruta
  }
]);