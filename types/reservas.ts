export interface Reserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: "activa" | "pendiente" | "cancelada" | "completada";
  sala_id: string | null;
  motivo?: string | null;
  salas?: {
    nombre: string;
    edificio?: string | null;
  } | null;
  usuario_id?: string;
  created_at?: string;
  updated_at?: string;
  distancia_minutos?: number;
  recomendacion?: string;
}


