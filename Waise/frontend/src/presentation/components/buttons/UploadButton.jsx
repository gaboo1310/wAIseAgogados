import React from 'react';
import PropTypes from 'prop-types';
import './UploadButton.css'; // Asegúrate de crear un archivo CSS para los estilos del botón

const UploadButton = ({ onClick }) => {
  return (
    <button className='upload-bar-button' onClick={onClick}>
      <img src="/icons/download.svg" alt="download" className="download-icon" />
      Cargar Desde el ordenador
    </button>
  );
};

UploadButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export default UploadButton;