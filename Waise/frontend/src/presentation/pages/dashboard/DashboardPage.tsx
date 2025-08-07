import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './dashboard.css';

// Definición de módulos disponibles
const modules = [
  {
    id: 'waisechat',
    name: 'Waise Chat',
    description: 'Chat inteligente con IA para consultas legales',
    icon: '💬',
    route: '/waisechat',
    color: '#4F46E5',
    status: 'active'
  },
  {
    id: 'document-generator',
    name: 'Generador de Documentos',
    description: 'Genera documentos legales automáticamente',
    icon: '📄',
    route: '/document-generator',
    color: '#059669',
    status: 'active'
  },
  {
    id: 'document-editor',
    name: 'Editor de Documentos',
    description: 'Edita y modifica documentos existentes',
    icon: '✏️',
    route: '/document-editor',
    color: '#7C3AED',
    status: 'active'
  },
  {
    id: 'upload-documents',
    name: 'Gestión de Documentos',
    description: 'Sube documentos con OCR automático y RAG vectorizado',
    icon: '📤',
    route: '/upload-documents',
    color: '#EA580C',
    status: 'active'
  },
  {
    id: 'saved-documents',
    name: 'Documentos Guardados',
    description: 'Accede a tus documentos guardados',
    icon: '💾',
    route: '/saved-documents',
    color: '#65A30D',
    status: 'active'
  },
];

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth0();

  const handleModuleClick = (module: typeof modules[0]) => {
    if (module.status === 'active') {
      navigate(module.route);
    }
  };

  const handleLogout = () => {
    logout({ 
      logoutParams: { returnTo: window.location.origin + '/welcome' }
    });
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Waise Legal AI</h1>
            <p className="dashboard-subtitle">Sistema Integral de Gestión Legal</p>
          </div>
          <div className="dashboard-user-section">
            <div className="user-info">
              <img 
                src={user?.picture || '/default-avatar.png'} 
                alt={user?.name || 'Usuario'} 
                className="user-avatar"
              />
              <div className="user-details">
                <span className="user-name">{user?.name || 'Usuario'}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="logout-button"
              title="Cerrar sesión"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Welcome Section */}
          <section className="welcome-section">
            <h2 className="welcome-title">
              ¡Bienvenido de vuelta, {user?.given_name || 'Usuario'}!
            </h2>
            <p className="welcome-description">
              Selecciona un módulo para comenzar a trabajar con tus documentos legales
            </p>
          </section>

          {/* Modules Grid */}
          <section className="modules-section">
            <h3 className="modules-title">Módulos Disponibles</h3>
            <div className="modules-grid">
              {modules.map((module) => (
                <div 
                  key={module.id}
                  className={`module-card ${module.status}`}
                  onClick={() => handleModuleClick(module)}
                  style={{ '--module-color': module.color } as React.CSSProperties}
                >
                  <div className="module-icon">
                    {module.icon}
                  </div>
                  <div className="module-content">
                    <h4 className="module-name">{module.name}</h4>
                    <p className="module-description">{module.description}</p>
                    {module.status === 'coming-soon' && (
                      <span className="coming-soon-badge">Próximamente</span>
                    )}
                  </div>
                  <div className="module-arrow">
                    {module.status === 'active' ? '→' : '⏳'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Stats */}
          <section className="stats-section">
            <h3 className="stats-title">Estado del Sistema</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <span className="stat-number">5</span>
                  <span className="stat-label">Módulos Activos</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔧</div>
                <div className="stat-content">
                  <span className="stat-number">0</span>
                  <span className="stat-label">En Desarrollo</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🚀</div>
                <div className="stat-content">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Sistema Operativo</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2024 Waise Legal AI - Sistema de Gestión Legal</p>
      </footer>
    </div>
  );
};

export default DashboardPage;