import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './uploadDocuments.css';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  uploadedAt?: string;
  path: string;
}


const UploadDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [showCreateFolder, setShowCreateFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [draggedFile, setDraggedFile] = useState<FileItem | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverParent, setDragOverParent] = useState<boolean>(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState<boolean>(false);
  const [folderToDelete, setFolderToDelete] = useState<FileItem | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<boolean>(false);
  const [confirmationText, setConfirmationText] = useState<string>('');

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async (forcePath?: string) => {
    const pathToUse = forcePath !== undefined ? forcePath : currentPath;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('📂 Loading files for path:', pathToUse);
      
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/list?path=${encodeURIComponent(pathToUse)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Load files error:', response.status, errorText);
        throw new Error(`Error cargando archivos: ${response.status}`);
      }

      const data = await response.json();
      const newFiles = data.files || [];
      setFiles(newFiles);
      console.log('📋 Files loaded successfully:', newFiles.length, 'files');
      console.log('📋 File names:', newFiles.map((f: FileItem) => f.name));
      console.log('📋 File paths:', newFiles.map((f: FileItem) => `${f.name} -> ${f.path}`));
      console.log('📋 Current path context:', pathToUse);
      
    } catch (error) {
      console.error('❌ Error loading files:', error);
      setError(`Error cargando los archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {
      for (const file of Array.from(selectedFiles)) {
        console.log('📤 Uploading file:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath);

        const token = await getAccessTokenSilently();
        const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error subiendo ${file.name}`);
        }

        console.log('✅ File uploaded:', file.name);
      }

      // Recargar archivos después de subir
      await loadFiles();
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Error subiendo archivos');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      console.log('📁 Creating folder:', newFolderName);
      
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          folderName: newFolderName,
          path: currentPath
        }),
      });

      if (!response.ok) {
        throw new Error('Error creando carpeta');
      }

      console.log('✅ Folder created');
      setNewFolderName('');
      setShowCreateFolder(false);
      await loadFiles();
      
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Error creando la carpeta');
    }
  };

  const openFolder = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
  };

  const goBack = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const downloadFile = async (file: FileItem) => {
    try {
      console.log('📥 Downloading file:', file.name);
      
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/download/${encodeURIComponent(file.path)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error descargando archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Error descargando el archivo');
    }
  };

  const viewFile = (file: FileItem) => {
    console.log('👁️ Viewing file:', file.name, file);
    console.log('📍 Navigating to document viewer with state:', { file });
    navigate('/2Marval/document-viewer', {
      state: {
        file: file
      }
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const confirmDelete = (file: FileItem) => {
    console.log('🗑️ CONFIRM DELETE - File info:', file);
    console.log('🗑️ CONFIRM DELETE - File name:', file.name);
    console.log('🗑️ CONFIRM DELETE - File path:', file.path);
    console.log('🗑️ CONFIRM DELETE - Current path:', currentPath);
    
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const deleteFile = async () => {
    if (!fileToDelete) {
      console.error('❌ No file to delete');
      return;
    }

    console.log('🗑️ Starting deletion process for:', fileToDelete);
    setDeleting(true);
    setError('');

    try {
      console.log('🗑️ Deleting file:', fileToDelete.name);
      console.log('🗑️ File path:', fileToDelete.path);
      
      const token = await getAccessTokenSilently();
      console.log('🔑 Token obtained:', token ? 'YES' : 'NO');
      
      const deleteUrl = `${import.meta.env.VITE_API_URL}/uploads/delete/${encodeURIComponent(fileToDelete.path)}`;
      console.log('🔗 Delete URL:', deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete response error:', response.status, errorText);
        throw new Error(`Error eliminando el archivo: ${response.status} ${errorText}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ File deleted successfully:', result);
      } catch (parseError) {
        console.log('✅ File deleted successfully (no JSON response)');
        result = { success: true, message: 'Archivo eliminado' };
      }
      
      // Actualización inmediata del estado para feedback visual rápido
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(f => f.path !== fileToDelete.path);
        console.log('📋 Immediate UI update - removed file from list');
        return updatedFiles;
      });
      
      // Cerrar modal inmediatamente para mejor UX
      setShowDeleteModal(false);
      setFileToDelete(null);
      
      // Recargar archivos desde el servidor para sincronizar
      console.log('🔄 Reloading current directory files...');
      await loadFiles();
      
      // También podríamos forzar una actualización del directorio padre
      // pero por ahora confiamos en que el servidor tenga la información correcta
      
      console.log('✅ Delete process completed successfully');
      
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      setError(`Error eliminando el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    if (file.type === 'file') {
      setDraggedFile(file);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', file.id);
    }
  };

  const handleDragOver = (e: React.DragEvent, folderName?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (folderName) {
      setDragOverFolder(folderName);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo limpiar si realmente salimos del elemento
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    
    if (!draggedFile) return;

    const originalDraggedFile = { ...draggedFile };

    try {
      console.log('🎯 Moving file:', draggedFile.name, 'to folder:', targetFolder);
      console.log('🎯 Original path:', draggedFile.path);
      
      const targetPath = currentPath ? `${currentPath}/${targetFolder}` : targetFolder;
      console.log('🎯 Target path:', targetPath);
      
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourcePath: draggedFile.path,
          targetPath: targetPath,
          fileName: draggedFile.name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Move response error:', response.status, errorText);
        throw new Error(`Error moviendo el archivo: ${response.status}`);
      }

      console.log('✅ File moved successfully');
      
      // Actualización inmediata del estado - remover archivo de la lista actual
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(f => f.path !== originalDraggedFile.path);
        console.log('📋 Removed moved file from current view');
        return updatedFiles;
      });
      
      // Recargar archivos desde el servidor para sincronizar
      await loadFiles();
      
    } catch (error) {
      console.error('❌ Error moving file:', error);
      setError(`Error moviendo el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDraggedFile(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedFile(null);
    setDragOverFolder(null);
    setDragOverParent(false);
  };

  const handleParentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedFile) {
      setDragOverParent(true);
    }
  };

  const handleParentDragLeave = (e: React.DragEvent) => {
    // Solo limpiar si realmente salimos del contenedor
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverParent(false);
    }
  };

  const handleParentDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverParent(false);
    
    if (!draggedFile || !currentPath) return; // Solo permitir si estamos dentro de una carpeta

    try {
      console.log('🎯 Moving file to parent directory:', draggedFile.name);
      console.log('🎯 Current path:', currentPath);
      
      // Calcular el directorio padre
      const pathParts = currentPath.split('/');
      pathParts.pop(); // Remover la última parte (carpeta actual)
      const parentPath = pathParts.join('/');
      
      console.log('🎯 Parent path:', parentPath);
      
      const token = await getAccessTokenSilently();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourcePath: draggedFile.path,
          targetPath: parentPath,
          fileName: draggedFile.name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Move to parent error:', response.status, errorText);
        throw new Error(`Error moviendo archivo al directorio padre: ${response.status}`);
      }

      console.log('✅ File moved to parent successfully');
      
      // Actualización inmediata del estado - remover archivo de la lista actual
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(f => f.path !== draggedFile.path);
        console.log('📋 Removed moved file from current folder view');
        return updatedFiles;
      });
      
      // Recargar archivos desde el servidor para sincronizar la vista actual
      console.log('🔄 Reloading current directory after moving to parent...');
      await loadFiles();
      
      console.log('✅ File moved to parent directory successfully - check parent directory to verify');
      
    } catch (error) {
      console.error('❌ Error moving file to parent:', error);
      setError(`Error moviendo el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDraggedFile(null);
    }
  };

  const confirmDeleteFolder = (folder: FileItem) => {
    console.log('🗑️ CONFIRM DELETE FOLDER - Folder info:', folder);
    console.log('🗑️ CONFIRM DELETE FOLDER - Folder name:', folder.name);
    console.log('🗑️ CONFIRM DELETE FOLDER - Folder path:', folder.path);
    console.log('🗑️ CONFIRM DELETE FOLDER - Current path:', currentPath);
    
    setFolderToDelete(folder);
    setConfirmationText('');
    setShowDeleteFolderModal(true);
  };

  const deleteFolder = async () => {
    if (!folderToDelete) {
      console.error('❌ No folder to delete');
      return;
    }

    if (confirmationText.toLowerCase() !== 'confirmar') {
      setError('Debes escribir "confirmar" para eliminar la carpeta');
      return;
    }

    console.log('🗑️ Starting folder deletion process for:', folderToDelete);
    setDeletingFolder(true);
    setError('');

    try {
      console.log('🗑️ Deleting folder:', folderToDelete.name);
      console.log('🗑️ Folder path:', folderToDelete.path);
      
      const token = await getAccessTokenSilently();
      console.log('🔑 Token obtained:', token ? 'YES' : 'NO');
      
      const deleteUrl = `${import.meta.env.VITE_API_URL}/uploads/delete-folder/${encodeURIComponent(folderToDelete.path)}`;
      console.log('🔗 Delete folder URL:', deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete folder response error:', response.status, errorText);
        throw new Error(`Error eliminando la carpeta: ${response.status} ${errorText}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ Folder deleted successfully:', result);
      } catch (parseError) {
        console.log('✅ Folder deleted successfully (no JSON response)');
        result = { success: true, message: 'Carpeta eliminada', deletedCount: 0 };
      }
      
      // Actualización inmediata del estado para feedback visual rápido
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(f => f.path !== folderToDelete.path);
        console.log('📋 Immediate UI update - removed folder from list');
        return updatedFiles;
      });
      
      // Cerrar modal inmediatamente para mejor UX
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
      setConfirmationText('');
      
      // Recargar archivos desde el servidor para sincronizar
      console.log('🔄 Reloading current directory files...');
      await loadFiles();
      
      console.log('✅ Folder delete process completed successfully');
      
    } catch (error) {
      console.error('❌ Error deleting folder:', error);
      setError(`Error eliminando la carpeta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDeletingFolder(false);
    }
  };

  return (
    <div className="upload-documents-page">
      {/* Header */}
      <header className="upload-header">
        <button 
          className="back-button"
          onClick={() => navigate('/2Marval/waisechat')}
        >
          ← Volver al Chat
        </button>
        
        <h1>📤 Subir Documentos</h1>

        <div className="header-actions">
          <button 
            className="create-folder-button"
            onClick={() => setShowCreateFolder(true)}
          >
            📁 Nueva Carpeta
          </button>
          <label className="upload-button">
            📤 Subir Archivos
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
            />
          </label>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={() => setCurrentPath('')} className="breadcrumb-item">
          🏠 Inicio
        </button>
        {currentPath.split('/').filter(Boolean).map((folder, index, arr) => (
          <React.Fragment key={index}>
            <span className="breadcrumb-separator">→</span>
            <button 
              onClick={() => setCurrentPath(arr.slice(0, index + 1).join('/'))}
              className="breadcrumb-item"
            >
              📁 {folder}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="upload-content">
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {uploading && (
          <div className="upload-progress">
            <div className="loading-spinner"></div>
            <p>Subiendo archivos...</p>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando archivos...</p>
          </div>
        ) : (
          <div 
            className={`files-grid ${dragOverParent ? 'drag-over-parent' : ''}`}
            onDragOver={currentPath ? handleParentDragOver : undefined}
            onDragLeave={currentPath ? handleParentDragLeave : undefined}
            onDrop={currentPath ? handleParentDrop : undefined}
          >
            {currentPath && (
              <div className="file-item folder-item" onClick={goBack}>
                <div className="file-icon">📁</div>
                <div className="file-info">
                  <h3>.. (Volver)</h3>
                  <p>Carpeta padre</p>
                </div>
              </div>
            )}

            {files.length === 0 && !currentPath ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <h3>No hay archivos subidos</h3>
                <p>Sube tus primeros documentos o crea una carpeta</p>
              </div>
            ) : (
              files.map((file) => (
                <div 
                  key={file.id} 
                  className={`file-item ${file.type === 'folder' ? 'folder-item' : ''} ${
                    file.type === 'folder' && dragOverFolder === file.name ? 'drag-over' : ''
                  } ${
                    draggedFile?.id === file.id ? 'being-dragged' : ''
                  }`}
                  draggable={file.type === 'file'}
                  onDragStart={(e) => handleDragStart(e, file)}
                  onDragEnd={handleDragEnd}
                  onDragOver={file.type === 'folder' ? (e) => handleDragOver(e, file.name) : undefined}
                  onDragLeave={file.type === 'folder' ? handleDragLeave : undefined}
                  onDrop={file.type === 'folder' ? (e) => handleDrop(e, file.name) : undefined}
                >
                  <div className="file-icon">
                    {file.type === 'folder' ? '📁' : getFileIcon(file.name)}
                  </div>
                  <div className="file-info">
                    <h3>{file.name}</h3>
                    <div className="file-meta">
                      {file.type === 'file' && (
                        <>
                          <p>{formatFileSize(file.size)}</p>
                          <p>{formatDate(file.uploadedAt)}</p>
                        </>
                      )}
                      {file.type === 'folder' && <p>Carpeta</p>}
                    </div>
                  </div>
                  
                  {/* File Actions */}
                  <div className="file-actions">
                    {file.type === 'folder' ? (
                      <>
                        <button 
                          className="action-button open-folder"
                          onClick={() => openFolder(file.name)}
                          title="Abrir carpeta"
                        >
                          📂 Abrir
                        </button>
                        <button 
                          className="action-button delete-folder"
                          onClick={() => confirmDeleteFolder(file)}
                          title="Eliminar carpeta"
                        >
                          🗑️ Eliminar
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="action-button view-file"
                          onClick={() => viewFile(file)}
                          title="Ver archivo"
                        >
                          👁️ Ver
                        </button>
                        <button 
                          className="action-button download-file"
                          onClick={() => downloadFile(file)}
                          title="Descargar archivo"
                        >
                          📥 Descargar
                        </button>
                        <button 
                          className="action-button delete-file"
                          onClick={() => confirmDelete(file)}
                          title="Eliminar archivo"
                        >
                          🗑️ Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="modal-overlay" onClick={() => setShowCreateFolder(false)}>
          <div className="create-folder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Crear Nueva Carpeta</h3>
              <button 
                className="close-modal-button"
                onClick={() => setShowCreateFolder(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-content">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta"
                className="folder-name-input"
                autoFocus
              />
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowCreateFolder(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="create-button"
                  onClick={createFolder}
                  disabled={!newFolderName.trim()}
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fileToDelete && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirmar Eliminación</h3>
              {!deleting && (
                <button 
                  className="close-modal-button"
                  onClick={() => setShowDeleteModal(false)}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="modal-content">
              <p>¿Estás seguro de que quieres eliminar el archivo <strong>"{fileToDelete.name}"</strong>?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button 
                  className="confirm-delete-button"
                  onClick={deleteFile}
                  disabled={deleting}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderModal && folderToDelete && (
        <div className="modal-overlay" onClick={() => !deletingFolder && setShowDeleteFolderModal(false)}>
          <div className="delete-folder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Eliminar Carpeta</h3>
              {!deletingFolder && (
                <button 
                  className="close-modal-button"
                  onClick={() => setShowDeleteFolderModal(false)}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="modal-content">
              <div className="danger-warning">
                <div className="warning-icon">🚨</div>
                <div className="warning-content">
                  <h4>¡ATENCIÓN! Esta es una acción peligrosa</h4>
                  <p>Estás a punto de eliminar la carpeta <strong>"{folderToDelete.name}"</strong> y <strong>TODOS los archivos que contiene</strong>.</p>
                </div>
              </div>
              
              <div className="danger-details">
                <p><strong>⚠️ Esta acción eliminará permanentemente:</strong></p>
                <ul>
                  <li>• La carpeta completa</li>
                  <li>• Todos los archivos dentro de la carpeta</li>
                  <li>• Todas las subcarpetas y su contenido</li>
                </ul>
                <p className="warning-text"><strong>Esta acción NO se puede deshacer.</strong></p>
              </div>

              <div className="confirmation-input-section">
                <p><strong>Para confirmar, escribe exactamente "confirmar" en el campo de abajo:</strong></p>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Escribe 'confirmar' para continuar"
                  className="confirmation-input"
                  disabled={deletingFolder}
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="cancel-button"
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setConfirmationText('');
                  }}
                  disabled={deletingFolder}
                >
                  Cancelar
                </button>
                <button 
                  className="confirm-delete-folder-button"
                  onClick={deleteFolder}
                  disabled={deletingFolder || confirmationText.toLowerCase() !== 'confirmar'}
                >
                  {deletingFolder ? 'Eliminando...' : 'Eliminar Carpeta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getFileIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return '📄';
    case 'doc':
    case 'docx': return '📝';
    case 'txt': return '📃';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return '🖼️';
    default: return '📄';
  }
};

export default UploadDocumentsPage;