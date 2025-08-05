import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert } from 'typeorm';
import { toZonedTime, format } from 'date-fns-tz';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column({ default: "false" })
  isGpt: string;

  @Column()
  userId: string; // ID del usuario que envió el mensaje (de Auth0)

  @Column({ nullable: true }) // Permite valores nulos
  conversationId?: string; // Identificador de la conversación

  @Column()
  createdAt: Date;

  @BeforeInsert()
  setCreatedAt(): void {
    const timeZone = 'America/Santiago';
    const now = new Date();
    // Convertir a zona horaria de Chile y formatear
    const chileTime = toZonedTime(now, timeZone);
    // Asegurar que la fecha se guarda en UTC pero con la hora correcta de Chile
    this.createdAt = new Date(chileTime.toISOString());
  }
}