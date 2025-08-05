export interface Card {
  image: {
    url: string;
    alt: string;
  };
  mainText: string[];
  secondaryText: string | string[];
  lastInformation: string[];
}

export const Cards: Card[] = [
  {
    image: {
      url: "/iconos/iconow1.png",
      alt: "iconow1"
    },
    mainText: [
      "Nuestro asistente evalúa cada \n ",
      "paso y factor individualmente, \n",
      "ajustando el resultado a las \n",
      "necesidades del usuario."
    ],
    secondaryText: "5-8",
    lastInformation: [
      "Horas ahorradas en \n",
      "organización"
    ]
  },
  {
    image: {
      url: "/iconos/iconow2.png",
      alt: "iconow2"
    },
    mainText: [
      "wAIse cifra contenido en tránsito y\n ", 
      "reposo, protegiendo datos con \n ",
      "infraestructura AWS."
    ],
    secondaryText: [
      "3x"
    ],
    lastInformation: [
      "Mayor diligencia en los datos"
    ]
  },
  {
    image: {
      url: "/iconos/iconow3.png",
      alt: "iconow3"
    },
    mainText: [
      "Diseñada para brindar apoyo con \n",
      "análisis rápidos, precisos y \n",
      "profundos."
    ],
    secondaryText: [
      "2.5x"
    ],
    lastInformation: [
      "Aumento en la productividad"
    ]
  }
];