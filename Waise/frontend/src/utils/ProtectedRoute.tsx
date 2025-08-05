import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <p>Cargando...</p>;
  if (!isAuthenticated) return <Navigate to="/welcome" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;