import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './documentEditor.css';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

interface SavedDocument {
  id: string;
  title: string;
  content: string;
  templateId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

const DocumentEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAccessTokenSilently } = useAuth0();
  const template = location.state?.template as DocumentTemplate;
  const existingDocument = location.state?.document as SavedDocument;
  const isEditing = location.state?.isEditing as boolean;
  
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const contentRef = useRef<string>('');

  useEffect(() => {
    if (isEditing && existingDocument) {
      // Editando documento existente
      setDocumentTitle(existingDocument.title);
      setDocumentContent(existingDocument.content);
      setDocumentId(existingDocument.id);
      setIsInitialized(true);
    } else if (template) {
      // Creando desde plantilla
      setDocumentTitle(`Nuevo ${template.name}`);
      generateInitialContent(template);
    } else {
      // Documento en blanco
      setDocumentTitle('Documento sin título');
      setDocumentContent('<p>Comienza a escribir tu documento aquí...</p>');
      setIsInitialized(true);
    }
  }, [template, existingDocument, isEditing]);

  // Efecto para inicializar el contenido del editor una sola vez
  useEffect(() => {
    if (isInitialized && editorRef.current && documentContent && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = documentContent;
      contentRef.current = documentContent;
    }
  }, [isInitialized]);

  const generateInitialContent = async (template: DocumentTemplate) => {
    setIsGenerating(true);
    
    // Simulamos la generación de contenido con IA
    // TODO: Conectar con la API de IA y Pinecone
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const templateContent = getTemplateContent(template.id);
    setDocumentContent(templateContent);
    setIsGenerating(false);
    setIsInitialized(true);
  };

  const getTemplateContent = (templateId: string): string => {
    const templates: Record<string, string> = {
      'contrato-compraventa': `
        <h1 style="text-align: center; margin-bottom: 30px;">CONTRATO DE COMPRAVENTA</h1>
        
        <p style="margin-bottom: 20px;">En la ciudad de ____________, a los _____ días del mes de ____________ de 2024, comparecen:</p>
        
        <div style="margin: 20px 0;">
          <p><strong>EL VENDEDOR:</strong> Don/Doña ____________, mayor de edad, de profesión ____________, domiciliado en ____________, portador de cédula de identidad N° ____________.</p>
          
          <p><strong>EL COMPRADOR:</strong> Don/Doña ____________, mayor de edad, de profesión ____________, domiciliado en ____________, portador de cédula de identidad N° ____________.</p>
        </div>
        
        <p>Quienes convienen en la celebración del presente contrato de compraventa, conforme a las siguientes cláusulas:</p>
        
        <h3>PRIMERA: OBJETO DEL CONTRATO</h3>
        <p>El vendedor transfiere en dominio al comprador el siguiente bien inmueble: ____________</p>
        
        <h3>SEGUNDA: PRECIO</h3>
        <p>El precio de la venta es la suma de $____________ (____________ pesos), que el comprador pagará de la siguiente forma: ____________</p>
        
        <h3>TERCERA: ENTREGA</h3>
        <p>La entrega del inmueble se realizará el día ____________, momento en que se hará entrega de todas las llaves y documentos correspondientes.</p>
        
        <div style="margin-top: 40px;">
          <p>Para constancia se firma en dos ejemplares del mismo tenor y valor.</p>
          <br><br>
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p>_________________________</p>
              <p>EL VENDEDOR</p>
            </div>
            <div>
              <p>_________________________</p>
              <p>EL COMPRADOR</p>
            </div>
          </div>
        </div>
      `,
      'contrato-arrendamiento': `
        <h1 style="text-align: center; margin-bottom: 30px;">CONTRATO DE ARRENDAMIENTO</h1>
        
        <p>En ____________, a _____ de ____________ de 2024, entre:</p>
        
        <div style="margin: 20px 0;">
          <p><strong>EL ARRENDADOR:</strong> ____________, identificado con ____________</p>
          <p><strong>EL ARRENDATARIO:</strong> ____________, identificado con ____________</p>
        </div>
        
        <p>Se celebra el presente contrato de arrendamiento:</p>
        
        <h3>CLÁUSULA PRIMERA: OBJETO</h3>
        <p>Se arrienda el inmueble ubicado en: ____________</p>
        
        <h3>CLÁUSULA SEGUNDA: PLAZO</h3>
        <p>El plazo del arrendamiento será de _____ meses, desde el _____ hasta el _____.</p>
        
        <h3>CLÁUSULA TERCERA: CANON DE ARRENDAMIENTO</h3>
        <p>El valor mensual del arrendamiento es de $____________, pagadero por mes anticipado.</p>
      `,
      'poder-notarial': `
        <h1 style="text-align: center; margin-bottom: 30px;">PODER ESPECIAL</h1>
        
        <p>Yo, ____________, mayor de edad, identificado con ____________, domiciliado en ____________, por medio del presente instrumento OTORGO PODER ESPECIAL a:</p>
        
        <p><strong>____________</strong>, mayor de edad, identificado con ____________, domiciliado en ____________.</p>
        
        <h3>PARA QUE EN MI NOMBRE Y REPRESENTACIÓN:</h3>
        <ul>
          <li>____________</li>
          <li>____________</li>
          <li>____________</li>
        </ul>
        
        <p>Este poder se otorga por el término de ____________ y podrá ser revocado en cualquier momento mediante notificación escrita.</p>
      `,
      'demanda-civil': `
        <h1 style="text-align: center; margin-bottom: 30px;">DEMANDA CIVIL</h1>
        
        <p><strong>SEÑOR JUEZ CIVIL:</strong></p>
        
        <p>____________, mayor de edad, identificado con ____________, domiciliado en ____________, actuando por derecho propio, a usted respetuosamente me dirijo para exponer:</p>
        
        <h3>I. HECHOS</h3>
        <p>1. ____________</p>
        <p>2. ____________</p>
        <p>3. ____________</p>
        
        <h3>II. PRETENSIONES</h3>
        <p>Con base en los hechos expuestos, solicito se sirva:</p>
        <p>1. ____________</p>
        <p>2. ____________</p>
        
        <h3>III. FUNDAMENTOS DE DERECHO</h3>
        <p>Fundamento mi petición en las siguientes normas: ____________</p>
      `,
      'testamento': `
        <h1 style="text-align: center; margin-bottom: 30px;">TESTAMENTO</h1>
        
        <p>Yo, ____________, mayor de edad, identificado con ____________, en pleno uso de mis facultades mentales, otorgo mi testamento en los siguientes términos:</p>
        
        <h3>PRIMERA: DECLARACIÓN</h3>
        <p>Declaro que soy de nacionalidad ____________, estado civil ____________.</p>
        
        <h3>SEGUNDA: DISPOSICIÓN DE BIENES</h3>
        <p>Dispongo de mis bienes de la siguiente manera:</p>
        <ul>
          <li>____________</li>
          <li>____________</li>
        </ul>
        
        <h3>TERCERA: ALBACEA</h3>
        <p>Nombro como albacea a ____________, quien se encargará de ejecutar las disposiciones de este testamento.</p>
      `,
      'constitucion-sociedad': `
        <h1 style="text-align: center; margin-bottom: 30px;">ESCRITURA DE CONSTITUCIÓN DE SOCIEDAD</h1>
        
        <p>En la ciudad de ____________, a los _____ días del mes de ____________ de 2024, ante mí, ____________, Notario Público, comparecen los señores:</p>
        
        <div style="margin: 20px 0;">
          <p>1. ____________, identificado con ____________</p>
          <p>2. ____________, identificado con ____________</p>
        </div>
        
        <p>Quienes manifiestan su voluntad de constituir una sociedad con las siguientes características:</p>
        
        <h3>ARTÍCULO PRIMERO: DENOMINACIÓN</h3>
        <p>La sociedad se denominará "____________"</p>
        
        <h3>ARTÍCULO SEGUNDO: OBJETO SOCIAL</h3>
        <p>La sociedad tendrá por objeto: ____________</p>
        
        <h3>ARTÍCULO TERCERO: DURACIÓN</h3>
        <p>La duración de la sociedad será de _____ años.</p>
        
        <h3>ARTÍCULO CUARTO: CAPITAL SOCIAL</h3>
        <p>El capital social será de $____________</p>
      `
    };
    
    return templates[templateId] || '<p>Plantilla no encontrada. Comienza a escribir tu documento aquí...</p>';
  };

  const handleSave = () => {
    setShowSaveModal(true);
  };

  const saveDocument = async (saveToCloud: boolean = false) => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const currentContent = contentRef.current || (editorRef.current?.innerHTML || '');
      const now = new Date().toISOString();
      
      const documentData: SavedDocument = {
        id: documentId || generateDocumentId(),
        title: documentTitle || 'Documento sin título',
        content: currentContent,
        templateId: template?.id,
        templateName: template?.name,
        createdAt: documentId ? getExistingDocument()?.createdAt || now : now,
        updatedAt: now
      };

      if (saveToCloud) {
        // TODO: Implementar guardado en el backend/base de datos
        await saveToBackend(documentData);
        setSaveMessage('Documento guardado en la nube exitosamente');
      } else {
        // Guardar en localStorage
        saveToLocalStorage(documentData);
        setSaveMessage('Documento guardado localmente');
      }
      
      setDocumentId(documentData.id);
      
      setTimeout(() => {
        setShowSaveModal(false);
        setSaveMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error al guardar:', error);
      setSaveMessage('Error al guardar el documento');
    } finally {
      setIsSaving(false);
    }
  };

  const saveToLocalStorage = (document: SavedDocument) => {
    const existingDocs = JSON.parse(localStorage.getItem('savedDocuments') || '[]');
    const docIndex = existingDocs.findIndex((doc: SavedDocument) => doc.id === document.id);
    
    if (docIndex >= 0) {
      existingDocs[docIndex] = document;
    } else {
      existingDocs.push(document);
    }
    
    localStorage.setItem('savedDocuments', JSON.stringify(existingDocs));
  };

  const saveToBackend = async (document: SavedDocument) => {
    try {
      console.log('🚀 Saving to backend with Auth0');
      const token = await getAccessTokenSilently();
      console.log('Token obtained:', token ? 'YES ✅' : 'NO ❌');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: document.id,
          title: document.title,
          content: document.content,
          templateId: document.templateId,
          templateName: document.templateName
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        throw new Error(`Error guardando en S3: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Documento guardado en S3:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error guardando en S3:', error);
      throw error;
    }
  };

  const generateDocumentId = (): string => {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const getExistingDocument = (): SavedDocument | null => {
    if (!documentId) return null;
    const existingDocs = JSON.parse(localStorage.getItem('savedDocuments') || '[]');
    return existingDocs.find((doc: SavedDocument) => doc.id === documentId) || null;
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const exportToPDF = () => {
    const content = contentRef.current || editorRef.current?.innerHTML || '';
    const title = documentTitle || 'documento';
    
    // Crear un elemento temporal para el contenido
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
            }
            h1 { font-size: 18pt; font-weight: bold; margin-bottom: 1.5rem; }
            h2 { font-size: 16pt; font-weight: bold; margin: 1.5rem 0 1rem 0; }
            h3 { font-size: 14pt; font-weight: bold; margin: 1rem 0 0.5rem 0; }
            p { margin-bottom: 1rem; text-align: justify; }
            ul, ol { margin: 1rem 0; padding-left: 2rem; }
            li { margin-bottom: 0.5rem; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
    setShowExportModal(false);
  };

  const exportToWord = () => {
    const content = contentRef.current || editorRef.current?.innerHTML || '';
    const title = documentTitle || 'documento';
    
    // Crear contenido HTML completo para Word
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
          }
          h1 { font-size: 18pt; font-weight: bold; margin-bottom: 1.5rem; }
          h2 { font-size: 16pt; font-weight: bold; margin: 1.5rem 0 1rem 0; }
          h3 { font-size: 14pt; font-weight: bold; margin: 1rem 0 0.5rem 0; }
          p { margin-bottom: 1rem; text-align: justify; }
          ul, ol { margin: 1rem 0; padding-left: 2rem; }
          li { margin-bottom: 0.5rem; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
    
    // Crear y descargar archivo
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportModal(false);
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      contentRef.current = newContent;
      // No actualizar el estado para evitar re-renders
    }
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleEditorChange();
    
    // Update color indicators
    if (command === 'foreColor' && value) {
      const indicator = document.getElementById('text-color-indicator');
      if (indicator) indicator.style.backgroundColor = value;
    }
    if (command === 'hiliteColor' && value) {
      const indicator = document.getElementById('bg-color-indicator');
      if (indicator) indicator.style.backgroundColor = value;
    }
  };

  const setLineHeight = (value: string) => {
    if (!value || !editorRef.current) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        // Si no hay selección, aplicar al párrafo completo
        const element = range.startContainer.nodeType === Node.TEXT_NODE 
          ? range.startContainer.parentElement 
          : range.startContainer as Element;
        
        let targetElement = element;
        while (targetElement && targetElement !== editorRef.current && 
               !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(targetElement.tagName)) {
          targetElement = targetElement.parentElement;
        }
        
        if (targetElement && targetElement !== editorRef.current) {
          (targetElement as HTMLElement).style.lineHeight = value;
        }
      } else {
        // Si hay selección, envolver en span con line-height
        const span = document.createElement('span');
        span.style.lineHeight = value;
        
        try {
          range.surroundContents(span);
        } catch (e) {
          // Si falla surroundContents, usar insertNode
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
        
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
      }
    }
    
    handleEditorChange();
  };

  // TEST FUNCTION - Remove after debugging
  const testAuth0Token = async () => {
    try {
      console.log('🧪 Testing Auth0 token...');
      const token = await getAccessTokenSilently();
      console.log('Token obtained:', token ? 'YES ✅' : 'NO ❌');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/test/auth`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('Auth test result:', result);
      alert(`Auth Test: ${result.success ? 'PASSED ✅' : 'FAILED ❌'}\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Auth test error:', error);
      alert(`Auth Test FAILED ❌: ${error.message}`);
    }
  };

  return (
    <div className="document-editor-page">
      {/* Header */}
      <header className="editor-header">
        <div className="header-left">
          <div className="document-info">
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="document-title-input"
              placeholder="Título del documento"
            />
            {template && (
              <span className="template-badge">
                {template.icon} {template.name}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          <button onClick={testAuth0Token} className="save-button" style={{background: '#f39c12'}}>
            🧪 Test Auth
          </button>
          <button onClick={handleSave} className="save-button">
            💾 Guardar
          </button>
          <button onClick={handleExport} className="export-button">
            📄 Exportar
          </button>
        </div>
      </header>

      {/* Toolbar */}
      {showToolbar && (
        <div className="editor-toolbar">
          {/* Font and Size Group */}
          <div className="toolbar-group">
            <select onChange={(e) => formatText('fontName', e.target.value)} className="toolbar-select font-select">
              <option value="">Fuente</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Calibri">Calibri</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Helvetica">Helvetica</option>
            </select>
            <select onChange={(e) => formatText('fontSize', e.target.value)} className="toolbar-select size-select">
              <option value="">Tamaño</option>
              <option value="1">8pt</option>
              <option value="2">10pt</option>
              <option value="3">12pt</option>
              <option value="4">14pt</option>
              <option value="5">18pt</option>
              <option value="6">24pt</option>
              <option value="7">36pt</option>
            </select>
          </div>

          <div className="toolbar-separator"></div>

          {/* Basic Format Group */}
          <div className="toolbar-group">
            <button onClick={() => formatText('bold')} className="toolbar-button" title="Negrita">
              <strong>B</strong>
            </button>
            <button onClick={() => formatText('italic')} className="toolbar-button" title="Cursiva">
              <em>I</em>
            </button>
            <button onClick={() => formatText('underline')} className="toolbar-button" title="Subrayado">
              <u>U</u>
            </button>
            <button onClick={() => formatText('strikeThrough')} className="toolbar-button" title="Tachado">
              <s>S</s>
            </button>
          </div>

          <div className="toolbar-separator"></div>

          {/* Text Color Group */}
          <div className="toolbar-group">
            <div className="color-picker-container">
              <button className="toolbar-button color-button" title="Color de texto">
                A
                <div className="color-indicator" id="text-color-indicator"></div>
              </button>
              <input 
                type="color" 
                id="text-color-picker" 
                className="color-picker"
                onChange={(e) => formatText('foreColor', e.target.value)}
                defaultValue="#000000"
              />
            </div>
            <div className="color-picker-container">
              <button className="toolbar-button color-button" title="Color de fondo">
                🎨
                <div className="color-indicator" id="bg-color-indicator"></div>
              </button>
              <input 
                type="color" 
                id="bg-color-picker" 
                className="color-picker"
                onChange={(e) => formatText('hiliteColor', e.target.value)}
                defaultValue="#ffff00"
              />
            </div>
          </div>

          <div className="toolbar-separator"></div>

          {/* Alignment Group */}
          <div className="toolbar-group">
            <button onClick={() => formatText('justifyLeft')} className="toolbar-button" title="Alinear izquierda">
              ⬅️
            </button>
            <button onClick={() => formatText('justifyCenter')} className="toolbar-button" title="Centrar">
              ↔️
            </button>
            <button onClick={() => formatText('justifyRight')} className="toolbar-button" title="Alinear derecha">
              ➡️
            </button>
            <button onClick={() => formatText('justifyFull')} className="toolbar-button" title="Justificar">
              ⬌
            </button>
          </div>

          <div className="toolbar-separator"></div>

          {/* Lists Group */}
          <div className="toolbar-group">
            <button onClick={() => formatText('insertUnorderedList')} className="toolbar-button" title="Lista con viñetas">
              • 
            </button>
            <button onClick={() => formatText('insertOrderedList')} className="toolbar-button" title="Lista numerada">
              1.
            </button>
            <button onClick={() => formatText('outdent')} className="toolbar-button" title="Reducir sangría">
              ⬅
            </button>
            <button onClick={() => formatText('indent')} className="toolbar-button" title="Aumentar sangría">
              ➡
            </button>
          </div>

          <div className="toolbar-separator"></div>

          {/* Advanced Group */}
          <div className="toolbar-group">
            <select onChange={(e) => setLineHeight(e.target.value)} className="toolbar-select line-height-select" defaultValue="1.6">
              <option value="">Interlineado</option>
              <option value="1">Sencillo</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="1.6">1.6</option>
              <option value="2">Doble</option>
              <option value="2.5">2.5</option>
              <option value="3">Triple</option>
            </select>
            <button onClick={() => formatText('removeFormat')} className="toolbar-button" title="Limpiar formato">
              🧹
            </button>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="editor-container">
        {isGenerating ? (
          <div className="generating-content">
            <div className="loading-spinner"></div>
            <p>Generando contenido con IA...</p>
            <p className="loading-subtext">Estamos creando tu documento basado en la plantilla seleccionada</p>
          </div>
        ) : (
          <div
            ref={editorRef}
            className="document-editor"
            contentEditable={true}
            onBlur={handleEditorChange}
            suppressContentEditableWarning={true}
          />
        )}
      </div>

      {/* Botón flotante para volver */}
      <button 
        className="floating-back-button"
        onClick={() => navigate('/dashboard')}
      >
        ← Volver al Dashboard
      </button>

      {/* Modal de Guardado */}
      {showSaveModal && (
        <>
          <div className="modal-overlay" onClick={() => !isSaving && setShowSaveModal(false)}></div>
          <div className="save-modal">
            <div className="modal-header">
              <h3>Guardar Documento</h3>
              {!isSaving && (
                <button 
                  className="close-modal-button"
                  onClick={() => setShowSaveModal(false)}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="modal-content">
              {saveMessage ? (
                <div className="save-result">
                  <div className="save-success-icon">✅</div>
                  <p>{saveMessage}</p>
                </div>
              ) : (
                <>
                  <p>¿Dónde quieres guardar tu documento?</p>
                  <div className="save-options">
                    <button 
                      className="save-option-button local" 
                      onClick={() => saveDocument(false)}
                      disabled={isSaving}
                    >
                      <div className="save-icon">💾</div>
                      <div className="save-info">
                        <h4>Guardar Localmente</h4>
                        <p>Se guarda en tu navegador (acceso offline)</p>
                      </div>
                      {isSaving && <div className="loading-spinner-small"></div>}
                    </button>
                    <button 
                      className="save-option-button cloud" 
                      onClick={() => saveDocument(true)}
                      disabled={isSaving}
                    >
                      <div className="save-icon">☁️</div>
                      <div className="save-info">
                        <h4>Guardar en la Nube</h4>
                        <p>Accede desde cualquier dispositivo</p>
                      </div>
                      {isSaving && <div className="loading-spinner-small"></div>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de Exportación */}
      {showExportModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowExportModal(false)}></div>
          <div className="export-modal">
            <div className="modal-header">
              <h3>Exportar Documento</h3>
              <button 
                className="close-modal-button"
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <p>Selecciona el formato para exportar tu documento:</p>
              <div className="export-options">
                <button className="export-option-button pdf" onClick={exportToPDF}>
                  <div className="export-icon">📄</div>
                  <div className="export-info">
                    <h4>Exportar como PDF</h4>
                    <p>Abre el diálogo de impresión para guardar como PDF</p>
                  </div>
                </button>
                <button className="export-option-button word" onClick={exportToWord}>
                  <div className="export-icon">📝</div>
                  <div className="export-info">
                    <h4>Exportar como Word</h4>
                    <p>Descarga un archivo .doc compatible con Microsoft Word</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentEditorPage;