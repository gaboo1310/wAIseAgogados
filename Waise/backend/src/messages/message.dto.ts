


export class MessageDTO {
    id: number;
    text: string;
    isGpt: string;
    userId: string;
    conversationId?: string;
    createdAt: Date;
    formattedCreatedAt: string; // Propiedad adicional para la fecha formateada
  }
