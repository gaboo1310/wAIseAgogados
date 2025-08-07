import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './documentGenerator.css';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

const documentTemplates: DocumentTemplate[] = [
  {
    id: 'contrato-compraventa',
    name: 'Contrato de Compraventa',
    description: 'Contrato para la compraventa de bienes inmuebles',
    category: 'Contratos',
    icon: '📄'
  },
  {
    id: 'contrato-arrendamiento',
    name: 'Contrato de Arrendamiento',
    description: 'Contrato de alquiler de propiedades',
    category: 'Contratos',
    icon: '🏠'
  },
  {
    id: 'poder-notarial',
    name: 'Poder Notarial',
    description: 'Documento de representación legal',
    category: 'Poderes',
    icon: '⚖️'
  },
  {
    id: 'demanda-civil',
    name: 'Demanda Civil',
    description: 'Documento para iniciar proceso civil',
    category: 'Litigios',
    icon: '🏛️'
  },
  {
    id: 'testamento',
    name: 'Testamento',
    description: 'Documento de últimas voluntades',
    category: 'Sucesiones',
    icon: '📜'
  },
  {
    id: 'constitucion-sociedad',
    name: 'Constitución de Sociedad',
    description: 'Documento para crear una sociedad',
    category: 'Corporativo',
    icon: '🏢'
  }
];

const DocumentGeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = ['Todos', ...Array.from(new Set(documentTemplates.map(t => t.category)))];

  const filteredTemplates = documentTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'Todos' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    navigate('/document-editor', { state: { template } });
  };

  const handleCreateBlankDocument = () => {
    navigate('/document-editor');
  };

  return (
    <div className="document-generator-page">
      <header className="page-header">
        <button 
          className="back-button"
          onClick={() => navigate('/dashboard')}
        >
          ← Volver al Dashboard
        </button>
        <h1>Generador de Documentos Legales</h1>
        <p>Selecciona una plantilla para generar documentos legales con IA</p>
      </header>

      <div className="document-generator-content">
        <div className="sidebar">
          <div className="search-section">
            <input
              type="text"
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="category-section">
            <h3>Categorías</h3>
            <div className="category-buttons">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`category-button ${selectedCategory === category ? 'active' : ''}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="actions-section">
            <button
              onClick={handleCreateBlankDocument}
              className="create-blank-button"
            >
              📝 Documento en Blanco
            </button>
          </div>
        </div>

        <div className="templates-grid">
          <div className="templates-header">
            <h2>Plantillas Disponibles</h2>
            <span className="templates-count">
              {filteredTemplates.length} {filteredTemplates.length === 1 ? 'plantilla' : 'plantillas'}
            </span>
          </div>

          <div className="templates-container">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="template-card"
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="template-icon">
                  {template.icon}
                </div>
                <div className="template-info">
                  <h3 className="template-name">{template.name}</h3>
                  <p className="template-description">{template.description}</p>
                  <span className="template-category">{template.category}</span>
                </div>
                <div className="template-actions">
                  <button className="use-template-button">
                    Usar Plantilla
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="no-templates">
              <p>No se encontraron plantillas que coincidan con tu búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentGeneratorPage;