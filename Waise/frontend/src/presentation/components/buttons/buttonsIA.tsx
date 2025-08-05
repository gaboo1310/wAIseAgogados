
import { useNavigate } from "react-router-dom";

interface AIButtonProps {
  aiName: string;
  iconSrc: string;
  chatIconSrc: string;
  altText: string;
  onClick?: (aiName: string, chatIconSrc: string) => void;
  className?: string;
}

const AIButton = ({ aiName, iconSrc, chatIconSrc, altText, onClick, className }: AIButtonProps) => {
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (onClick) onClick(aiName, chatIconSrc);  // Llama la función personalizada para actualizar `activeAI`
    navigate(aiName);           // Luego navega a la ruta especificada
  };

  return (
    <button className={`${className} ai-button `} onClick={handleButtonClick}>
      <img src={iconSrc} alt={altText} className="button-icon" />
      {altText}
    </button>
  );
};

export default AIButton;