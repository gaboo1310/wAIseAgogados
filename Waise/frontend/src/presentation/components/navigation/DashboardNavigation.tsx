import React from 'react';
import { useNavigate } from 'react-router-dom';
import './dashboardNavigation.css';

interface DashboardNavigationProps {
  currentModule?: string;
  showBackButton?: boolean;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  currentModule = 'Dashboard',
  showBackButton = true
}) => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (!showBackButton) return null;

  return (
    <nav className="dashboard-navigation">
      <div className="nav-content">
        <button 
          onClick={handleBackToDashboard}
          className="back-to-dashboard-btn"
          title="Volver al Dashboard Principal"
        >
          <span className="back-icon">🏠</span>
          <span className="back-text">Dashboard</span>
        </button>
        
        <div className="current-module">
          <span className="module-indicator">📍</span>
          <span className="module-name">{currentModule}</span>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavigation;