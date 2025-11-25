import { CAMPUS_MAP } from "@/constants/campus";

/**
 * Calcula la ruta optimizada entre dos edificios del campus
 * Retorna una descripción de la ruta con instrucciones
 */
export const calculateRoute = (
  fromBuilding: string | null,
  toBuilding: string | null
): { minutes: number; instructions: string } | null => {
  if (!fromBuilding || !toBuilding || fromBuilding === toBuilding) {
    return null;
  }

  const from = CAMPUS_MAP.buildings.find((b) => b.id === fromBuilding);
  const to = CAMPUS_MAP.buildings.find((b) => b.id === toBuilding);

  if (!from || !to) {
    return null;
  }

  // Calcular distancia aproximada basada en coordenadas
  const dx = (to.x - from.x) * CAMPUS_MAP.width;
  const dy = (to.y - from.y) * CAMPUS_MAP.height;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minutes = Math.max(2, Math.round(distance / 50)); // ~50 unidades por minuto

  // Generar instrucciones basadas en la dirección
  let instructions = "";
  if (Math.abs(dx) > Math.abs(dy)) {
    // Movimiento horizontal predominante
    if (dx > 0) {
      instructions = `Dirígete hacia el este, pasa por el ${getIntermediateBuildings(fromBuilding, toBuilding)} hasta llegar al ${to.label}.`;
    } else {
      instructions = `Dirígete hacia el oeste, pasa por el ${getIntermediateBuildings(fromBuilding, toBuilding)} hasta llegar al ${to.label}.`;
    }
  } else {
    // Movimiento vertical predominante
    if (dy > 0) {
      instructions = `Dirígete hacia el sur, pasa por el ${getIntermediateBuildings(fromBuilding, toBuilding)} hasta llegar al ${to.label}.`;
    } else {
      instructions = `Dirígete hacia el norte, pasa por el ${getIntermediateBuildings(fromBuilding, toBuilding)} hasta llegar al ${to.label}.`;
    }
  }

  // Rutas específicas conocidas
  const knownRoutes: Record<string, string> = {
    "A-B": "Toma el camino por el pasillo central, cruza el patio y sube al segundo piso del Bloque B.",
    "B-C": "Sigue el corredor principal hacia el este, el Bloque C está justo al lado.",
    "C-D": "Baja al primer piso, cruza el jardín central y sube las escaleras del Bloque D.",
    "D-E": "Sigue el pasillo hacia el este, el Bloque E está conectado por un puente.",
    "E-F": "Toma el camino por el Bloque F, es el más cercano al estacionamiento.",
    "F-G": "Baja al nivel del suelo y cruza hacia el Bloque G por el atrio.",
    "G-H": "Sigue el corredor hacia el oeste, pasa por el comedor y llegarás al Bloque H.",
    "H-A": "Toma el camino por el Bloque A, es la ruta más directa.",
  };

  const routeKey = `${fromBuilding}-${toBuilding}`;
  const reverseKey = `${toBuilding}-${fromBuilding}`;

  if (knownRoutes[routeKey]) {
    instructions = knownRoutes[routeKey];
  } else if (knownRoutes[reverseKey]) {
    instructions = knownRoutes[reverseKey].replace(
      new RegExp(`${to.label}|${from.label}`, "g"),
      (match) => (match === to.label ? from.label : to.label)
    );
  }

  return { minutes, instructions };
};

/**
 * Obtiene edificios intermedios en la ruta
 */
const getIntermediateBuildings = (from: string, to: string): string => {
  const fromIndex = CAMPUS_MAP.buildings.findIndex((b) => b.id === from);
  const toIndex = CAMPUS_MAP.buildings.findIndex((b) => b.id === to);

  if (fromIndex === -1 || toIndex === -1) return "campus";

  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const intermediates = CAMPUS_MAP.buildings.slice(start + 1, end);

  if (intermediates.length === 0) return "campus";
  if (intermediates.length === 1) return intermediates[0].label;
  return intermediates.map((b) => b.label).join(", ");
};

/**
 * Genera una sugerencia de ruta optimizada de AURA
 */
export const generateRouteSuggestion = (
  fromBuilding: string | null,
  toBuilding: string | null,
  context?: string
): string | null => {
  const route = calculateRoute(fromBuilding, toBuilding);
  if (!route) return null;

  let suggestion = `Te quedan ${route.minutes} minutos. ${route.instructions}`;

  if (context) {
    suggestion += ` ${context}`;
  }

  return suggestion;
};

