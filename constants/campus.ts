export type CampusBuilding = {
  id: string;
  label: string;
  type: "salon" | "laboratorio" | "biblioteca" | "comun";
  x: number; // porcentaje relativo (0 - 1)
  y: number;
};

export const CAMPUS_MAP = {
  width: 360,
  height: 260,
  buildings: [
    { id: "A", label: "Bloque A", type: "salon", x: 0.18, y: 0.22 },
    { id: "B", label: "Bloque B", type: "laboratorio", x: 0.32, y: 0.28 },
    { id: "C", label: "Bloque C", type: "salon", x: 0.46, y: 0.18 },
    { id: "D", label: "Bloque D", type: "biblioteca", x: 0.62, y: 0.42 },
    { id: "E", label: "Bloque E", type: "salon", x: 0.78, y: 0.35 },
    { id: "F", label: "Bloque F", type: "comun", x: 0.72, y: 0.14 },
    { id: "G", label: "Bloque G", type: "salon", x: 0.52, y: 0.48 },
    { id: "H", label: "Bloque H", type: "laboratorio", x: 0.28, y: 0.48 },
  ] satisfies CampusBuilding[],
};

export const BUILDING_DISPLAY_NAMES = CAMPUS_MAP.buildings.reduce<Record<string, string>>((acc, building) => {
  acc[building.id] = building.label;
  return acc;
}, {});


