import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth0();

  // Show loading while Auth0 is still loading
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#6b7280',
        backgroundColor: '#fff',
        transition: 'opacity 0.2s ease-in-out'
      }}>
        Cargando...
      </div>
    );
  }

  // Only redirect if definitely not authenticated
  if (!isAuthenticated || !user) {
    console.log('[ProtectedRoute] Redirecting to welcome - isAuthenticated:', isAuthenticated, 'user:', !!user);
    return <Navigate to="/welcome" replace />;
  }

  // Render children with smooth transition
  return (
    <div style={{
      transition: 'opacity 0.2s ease-in-out',
      opacity: 1
    }}>
      {children}
    </div>
  );
};

export default ProtectedRoute;