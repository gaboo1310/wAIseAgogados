import { Routes, Route, Navigate } from "react-router-dom";

import LoginPages from "../auth/pages/LoginPages";

import WelcomePage from "../presentation/pages/welcome/WelcomePage";
import WaiseChatPage from "../presentation/pages/waisechat/WaiseChatPage";



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
        path="/waisechat" 
        element={<ProtectedRoute><WaiseChatPage /></ProtectedRoute>} 
      />
      
      <Route path="*" element={<Navigate to="/2Marval/welcome" replace />} />
    </Routes>
  );
};