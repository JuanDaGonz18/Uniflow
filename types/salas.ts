export type SalaEstado = "libre" | "ocupado" | "pronto";

export interface Sala {
  id: string;
  nombre: string;
  descripcion?: string | null;
  capacidad?: number | null;
  estado: SalaEstado | string; // Puede venir como string de la BD
  created_at?: string | null;
  // Campos calculados/derivados (no vienen de la BD)
  edificio?: string; // Extraído del nombre
  tipo?: string; // Extraído del nombre o descripción
  piso?: string | null;
  proxima_disponibilidad?: string | null;
  disponible_hasta?: string | null;
  tiempo_libre_minutos?: number | null;
  map_x?: number | null;
  map_y?: number | null;
  lat?: number | null;
  lng?: number | null;
  walkingMinutes?: number | null;
  reservado_por?: string | null;
  ocupante?: {
    usuario_id: string;
    nombre?: string | null;
  } | null;
}


