export interface Faq {
  question: string;
  answer: string;
}

export const Faqs = [
    {
      question: "¿Cómo garantiza wAIse la precisión de sus respuestas?",
      answer:
        "Nuestro asistente inteligente combina LLMs con algoritmos de búsqueda y generación, métodos avanzados como Contextual Retrieval y Propmt Caching para ofrecer respuestas precisas y a adaptadas al contexto. Esto asegura que la información éste siempre actualizada y relevante",
    },
    {
      question: "¿Qué diferencia a wAIse de otros LLMs tradicionales?",
      answer:
        "A diferencia de los LLMs tradicionales, nuestra solución permite que la IA acceda de manera segura y en tiempo real a los datos relevantes, lo que garantiza que la información esté siempre actualizada y optimizada para ofrecer soluciones altamente eficientes.",
    },
    {
      question: "¿Cómo protege wAIse la seguridad y privacidad de los datos?",
      answer:
        "wAIse cuenta con cifrado de contenido tanto en tránsito como en reposo. Los datos, metadatos, solicitudes y respuestas se encuentrasn dentro de un perímetro de seguridad utilizando infraestructura AWS, cumpliendo con normativas globales como RGPD, SOC, ISO y CSA.",
    },
    {
      question: "¿Qué es el Multi-Prompting y cómo mejora la interacción con wAIse?",
      answer:
        "El Multi-Prompting permite a wAIse participar en un diálogo solicitando información, dividiendo la evualuación en pasos más pequeños y abordando cada factor de manera individual. Esto garantiza que el resultado final se ajuste de manera precisa a las necesidades y expectativas del usuario.",
    },
    {
      question: "¿Qué medidas de seguridad adicionales ofrece wAIse?",
      answer:
        "Además de los estándares de seguridad robustos de AWS. wAIse implementa monitoreo y auditoriá en tiempo real para detectar amenazas y vulnerabilidades potenciales. Todo el trafico y las interacciones permanecen dentro de la región asignada a la instancia exclusiva, asegurando la privacidad y seguridad de la información en todo momento.",
    },
  ];