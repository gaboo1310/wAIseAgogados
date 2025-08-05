import { useState } from 'react';
import Slider from '../slider/Slider' // Asegúrate de importar el componente Slider correctamente
import './faq.css';

type Faq = {
  question: string;
  answer: string;
};

type FaqSectionProps = {
  Faqs: Faq[];
};

const FaqSection = ({ Faqs }: FaqSectionProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <h1>Preguntas Frecuentes</h1>
      <h2>Revisa nuestras Preguntas Frecuentes y encuentra respuestas rápidas a tus inquietudes.</h2>
      {Faqs.map((faq, index) => (
        <div className="faq-item" key={index}>
          <button
            className={activeIndex === index ? "active" : ""}
            onClick={() => toggleFAQ(index)}
          >
            {faq.question}
          </button>
          <div className={`faq-answer ${activeIndex === index ? "open" : ""}`}>
            <p>{faq.answer}</p>
          </div>
        </div>
      ))}
      <Slider />
    </section>
  );
};

export default FaqSection;
