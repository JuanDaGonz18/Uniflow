import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

import SalaFilters, { SalaFilterValues } from "@/app/home/salas/components/SalaFilters";
import SalaList from "@/app/home/salas/components/SalaList";
import { CAMPUS_MAP } from "@/constants/campus";
import { useAuth } from "@/contexts/AuthContext";
import { Sala } from "@/types/salas";
import { supabase } from "@/utils/supabase";

type Filters = SalaFilterValues;

type ReservationFormState = {
  date: Date;
  startTime: Date;
  duration: number;
  reason: string;
};

type Clase = {
  id: number;
  dia: string;
  materia: string;
  hora: string;
  salon?: string | null;
};

const DEFAULT_WALKING_TIMES: Record<string, number> = {
  A: 4,
  B: 5,
  C: 3,
  D: 6,
  E: 7,
  F: 2,
  G: 5,
  H: 4,
};

const addMinutes = (base: Date, minutes: number) => {
  const clone = new Date(base);
  clone.setMinutes(clone.getMinutes() + minutes);
  return clone;
};

const pad = (value: number) => value.toString().padStart(2, "0");

const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const EARTH_RADIUS = 6371000;
const toRad = (value: number) => (value * Math.PI) / 180;

const estimateWalkingMinutes = (user: Location.LocationObject | null, sala: Sala) => {
  // Si hay coordenadas GPS, usarlas
  if (user && sala.lat && sala.lng) {
    const dLat = toRad((sala.lat || 0) - user.coords.latitude);
    const dLon = toRad((sala.lng || 0) - user.coords.longitude);
    const lat1 = toRad(user.coords.latitude);
    const lat2 = toRad(sala.lat || 0);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = EARTH_RADIUS * c; // meters
    const minutes = Math.max(2, Math.round(distance / 75));
    return minutes;
  }

  // Si no hay GPS, usar tiempos estimados por edificio
  if (sala.edificio && DEFAULT_WALKING_TIMES[sala.edificio]) {
    return DEFAULT_WALKING_TIMES[sala.edificio];
  }

  // Default: 5 minutos
  return 5;
};

const getMapPosition = (sala: Sala) => {
  // Si hay coordenadas específicas del mapa, usarlas
  if (typeof sala.map_x === "number" && typeof sala.map_y === "number") {
    return {
      x: sala.map_x * CAMPUS_MAP.width,
      y: sala.map_y * CAMPUS_MAP.height,
    };
  }
  
  // Si no, usar la posición del edificio con un offset aleatorio pequeño para diferenciar salones
  const building = CAMPUS_MAP.buildings.find((b) => b.id === sala.edificio);
  if (!building) {
    // Si no encuentra el edificio, usar el primero como fallback
    const defaultBuilding = CAMPUS_MAP.buildings[0];
    if (!defaultBuilding) return null;
    return {
      x: defaultBuilding.x * CAMPUS_MAP.width + (Math.random() * 20 - 10),
      y: defaultBuilding.y * CAMPUS_MAP.height + (Math.random() * 20 - 10),
    };
  }
  
  // Agregar pequeño offset basado en el nombre para diferenciar salones del mismo edificio
  const hash = (sala.nombre || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offsetX = (hash % 30) - 15;
  const offsetY = ((hash * 7) % 30) - 15;
  
  return {
    x: building.x * CAMPUS_MAP.width + offsetX,
    y: building.y * CAMPUS_MAP.height + offsetY,
  };
};

// Helper: obtener abreviatura para etiquetas en círculo
const getAbbrev = (name: string | undefined, max = 3) =>
  (name || "")
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, max)
    .toUpperCase();

export default function SalonesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [filtered, setFiltered] = useState<Sala[]>([]);
  const [filters, setFilters] = useState<Filters>({
    edificio: "todos",
    tipo: "todos",
    disponibilidad: "ahora",
  });
  const [selectedSala, setSelectedSala] = useState<Sala | null>(null);
  const [reservationVisible, setReservationVisible] = useState(false);
  const [reservationForm, setReservationForm] = useState<ReservationFormState>({
    date: new Date(),
    startTime: new Date(),
    duration: 60,
    reason: "Bloque de estudio planificado por AURA",
  });
  const [showReservationDatePicker, setShowReservationDatePicker] = useState(false);
  const [showReservationTimePicker, setShowReservationTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingReservation, setSavingReservation] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [nextClass, setNextClass] = useState<Clase | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permiso de ubicación denegado");
        return;
      }
      const location = await Location.getCurrentPositionAsync(); // <- paréntesis añadidos
      setUserLocation(location);
    } catch (error) {
      console.warn("No se pudo obtener la ubicación:", error);
    }
  }, []);

  const cargarSalas = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const hoy = new Date().toISOString().split("T")[0];
      const [salasRes, reservasRes, horarioRes] = await Promise.all([
        supabase.from("salas").select("*").order("nombre", { ascending: true }),
        supabase
          .from("reservas")
          .select("id, sala_id, usuario_id, fecha, hora_inicio, hora_fin, estado")
          .gte("fecha", hoy),
        supabase
          .from("horario")
          .select("*")
          .eq("user_id", user.id)
          .order("dia", { ascending: true })
          .order("hora", { ascending: true }),
      ]);

      const reservas = reservasRes.data || [];
      const usuarioIds = Array.from(new Set(reservas.map((r) => r.usuario_id))).filter(Boolean) as string[];

      let usuariosMap: Record<string, string> = {};
      if (usuarioIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from("usuarios")
          .select("id, nombre")
          .in("id", usuarioIds);
        usuariosMap = (usuariosData || []).reduce<Record<string, string>>((acc, usuario) => {
          acc[usuario.id] = usuario.nombre;
          return acc;
        }, {});
      }

      const now = new Date();
      
      // Función para intentar detectar edificio del nombre (solo patrones muy claros)
      const detectarEdificio = (nombre: string): string | null => {
        const nombreUpper = (nombre || "").toUpperCase().trim();
        
        // Patrón 1: Buscar "Bloque X" o "Blq X" (muy específico)
        const bloqueMatch = nombreUpper.match(/(?:BLOQUE|BLQ)\s+([A-H])/i);
        if (bloqueMatch) {
          console.log(`✅ Detectado edificio por patrón "Bloque": ${nombre} -> ${bloqueMatch[1]}`);
          return bloqueMatch[1].toUpperCase();
        }
        
        // Patrón 2: Buscar letra seguida inmediatamente de números (ej: "A101", "B203")
        const salaMatch = nombreUpper.match(/^([A-H])\d+/);
        if (salaMatch) {
          console.log(`✅ Detectado edificio por patrón "Letra+Números": ${nombre} -> ${salaMatch[1]}`);
          return salaMatch[1].toUpperCase();
        }
        
        // Patrón 3: Buscar "Edificio X" o "Edif X"
        const edificioMatch = nombreUpper.match(/(?:EDIFICIO|EDIF)\s+([A-H])/i);
        if (edificioMatch) {
          console.log(`✅ Detectado edificio por patrón "Edificio": ${nombre} -> ${edificioMatch[1]}`);
          return edificioMatch[1].toUpperCase();
        }
        
        return null; // No se pudo detectar
      };

      // Función para extraer tipo del nombre o descripción
      const extractTipo = (nombre: string, descripcion?: string | null): string => {
        const text = `${nombre} ${descripcion || ""}`.toLowerCase();
        if (text.includes("laboratorio") || text.includes("lab")) return "Laboratorio";
        if (text.includes("biblioteca") || text.includes("bib")) return "Biblioteca";
        if (text.includes("auditorio") || text.includes("aud")) return "Auditorio";
        if (text.includes("sala") || text.includes("salon")) return "Salón";
        return "Salón"; // Default
      };

      console.log("📊 Salas cargadas de BD:", salasRes.data?.length || 0);
      
      if (!salasRes.data || salasRes.data.length === 0) {
        console.warn("⚠️ No se encontraron salas en la base de datos");
        setSalas([]);
        setFiltered([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Preparar distribución aleatoria balanceada de edificios
      const edificios = ["A", "B", "C", "D", "E", "F", "G", "H"];
      const totalSalas = salasRes.data.length;
      const salasPorEdificio = Math.ceil(totalSalas / edificios.length);
      
      // Crear array de edificios balanceado (ej: [A, B, C, D, E, F, G, H, A, B, ...])
      const edificiosDistribuidos: string[] = [];
      for (let i = 0; i < totalSalas; i++) {
        edificiosDistribuidos.push(edificios[i % edificios.length]);
      }
      
      // Mezclar aleatoriamente pero de forma consistente
      const hash = salasRes.data.reduce((acc, s) => acc + (s.nombre?.charCodeAt(0) || 0), 0);
      for (let i = edificiosDistribuidos.length - 1; i > 0; i--) {
        const j = (hash + i * 7) % (i + 1);
        [edificiosDistribuidos[i], edificiosDistribuidos[j]] = [edificiosDistribuidos[j], edificiosDistribuidos[i]];
      }

      const enriched = salasRes.data.map((sala, index) => {
        const reservasSala = reservas.filter((r) => r.sala_id === sala.id);
        const reservaActiva = reservasSala.find((reserva) => {
          if (reserva.estado === "cancelada") return false;
          const fecha = new Date(reserva.fecha);
          const [hiH, hiM] = (reserva.hora_inicio || "00:00").split(":").map(Number);
          fecha.setHours(hiH, hiM, 0, 0);
          const fin = new Date(reserva.fecha);
          const [hfH, hfM] = (reserva.hora_fin || "00:00").split(":").map(Number);
          fin.setHours(hfH, hfM, 0, 0);
          return fecha <= now && fin >= now;
        });

        // Normalizar estado
        const estadoNormalizado = reservaActiva 
          ? ("ocupado" as const) 
          : (sala.estado?.toLowerCase() === "libre" ? "libre" : sala.estado?.toLowerCase() === "ocupado" ? "ocupado" : "libre") as Sala["estado"];

        // Intentar detectar edificio del nombre
        const edificioDetectado = detectarEdificio(sala.nombre);
        // Si no se detectó, usar la distribución balanceada predefinida
        const edificio = edificioDetectado || edificiosDistribuidos[index];
        
        const tipo = extractTipo(sala.nombre, sala.descripcion);

        const walkingMinutes = estimateWalkingMinutes(userLocation, { ...sala, edificio });
        let tiempoLibre: number | null = null;
        
        // Calcular tiempo libre basado en reservas futuras
        const reservasFuturas = reservasSala
          .filter((r) => r.estado !== "cancelada")
          .map((r) => {
            const fecha = new Date(`${r.fecha}T${r.hora_inicio || "00:00"}`);
            return fecha;
          })
          .filter((fecha) => fecha > now)
          .sort((a, b) => a.getTime() - b.getTime());

        if (reservasFuturas.length > 0) {
          const proximaReserva = reservasFuturas[0];
          tiempoLibre = Math.max(15, Math.round((proximaReserva.getTime() - now.getTime()) / 60000));
        } else if (estadoNormalizado === "libre") {
          tiempoLibre = 120; // 2 horas por defecto si está libre
        }

        return {
          ...sala,
          estado: estadoNormalizado,
          edificio,
          tipo,
          walkingMinutes,
          reservado_por: reservaActiva ? usuariosMap[reservaActiva.usuario_id] ?? "Otro estudiante" : null,
          tiempo_libre_minutos: tiempoLibre,
        };
      });

      setSalas(enriched);
      setFiltered(enriched);

      // Próxima clase para sugerencias
      if (horarioRes.data && horarioRes.data.length > 0) {
        const ahora = new Date();
        const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
        const diaActual = dias[ahora.getDay()];
        let proxima: Clase | null = null;
        const clasesHoy = horarioRes.data.filter((c) => c.dia === diaActual);
        for (const clase of clasesHoy) {
          const [claseHora, claseMinuto] = clase.hora.split(":").map(Number);
          if (claseHora > ahora.getHours() || (claseHora === ahora.getHours() && claseMinuto > ahora.getMinutes())) {
            proxima = clase;
            break;
          }
        }
        if (!proxima) {
          proxima = horarioRes.data[0];
        }
        setNextClass(proxima ?? null);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudieron cargar los salones.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, userLocation]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    cargarSalas();
  }, [cargarSalas]);

  useEffect(() => {
    const filteredSalas = salas.filter((sala) => {
      if (filters.edificio !== "todos" && sala.edificio !== filters.edificio) return false;
      if (filters.tipo !== "todos" && sala.tipo !== filters.tipo) return false;
      if (filters.disponibilidad === "ahora" && sala.estado !== "libre") return false;
      if (filters.disponibilidad === "pronto" && sala.estado !== "pronto") return false;
      if (filters.disponibilidad === "franja" && (sala.tiempo_libre_minutos || 0) < 90) return false;
      return true;
    });
    setFiltered(filteredSalas);
  }, [filters, salas]);

  const stats = useMemo(() => {
    const libres = salas.filter((s) => s.estado === "libre").length;
    const ocupados = salas.filter((s) => s.estado === "ocupado").length;
    const pronto = salas.filter((s) => s.estado === "pronto").length;
    return { libres, ocupados, pronto };
  }, [salas]);

  const auraSuggestions = useMemo(() => {
    const suggestions: { title: string; description: string }[] = [];
    if (nextClass) {
      const targetEdificio = (nextClass.salon || "").charAt(0);
      const cercanos = salas.filter((sala) => sala.edificio === targetEdificio && sala.estado === "libre");
      if (cercanos.length > 0) {
        suggestions.push({
          title: "Prepara tu próxima clase",
          description: `AURA recomienda ${cercanos[0].nombre} para repasar antes de ${nextClass.materia}. Está a ${cercanos[0].walkingMinutes} min.`,
        });
      }
    }
    const salasRecientes = salas.filter((sala) => sala.estado === "libre").slice(0, 2);
    salasRecientes.forEach((sala) => {
      suggestions.push({
        title: sala.nombre,
        description: `${sala.capacidad || 20} puestos libres · ${sala.walkingMinutes} min caminando`,
      });
    });
    return suggestions;
  }, [nextClass, salas]);

  const edificiosOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        salas
          .map((s) => s.edificio)
          .filter((value): value is string => Boolean(value))
      )
    ).sort();
    return ["todos", ...unique];
  }, [salas]);
  
  const tiposOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        salas
          .map((s) => s.tipo)
          .filter((value): value is string => Boolean(value))
      )
    ).sort();
    return ["todos", ...unique];
  }, [salas]);

  // Layout circular no uniforme para edificios A..G (determinístico)
  const circleLayout = useMemo(() => {
    const centerX = CAMPUS_MAP.width * 0.5;
    const centerY = CAMPUS_MAP.height * 0.5;
    const baseRadius = Math.min(CAMPUS_MAP.width, CAMPUS_MAP.height) * 0.35;
    const buildings = CAMPUS_MAP.buildings.slice(0, 7); // A..G (siempre que existan)
    const N = Math.max(1, buildings.length);
    const map: Record<string, { x: number; y: number }> = {};

    buildings.forEach((b, i) => {
      // ángulo base distribuido uniformemente
      const baseAngle = (i / N) * Math.PI * 2;
      // jitter determinístico a partir del id para no superponer y dar aspecto "no uniforme"
      const hash = (b.id || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const jitterDeg = (hash % 40) - 20; // -20..19 grados
      const jitter = (jitterDeg * Math.PI) / 180;
      const angle = baseAngle + jitter;
      // variar radio ligeramente por edificio (0.8..1.15)
      const radialFactor = 0.8 + ((hash % 36) / 100);
      const r = baseRadius * radialFactor;
      // añadir escalado vertical para romper la simetría perfecta
      const yScale = 0.85 + ((hash % 25) / 200);

      map[b.id] = {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r * yScale,
      };
    });

    // fallback: el resto de edificios usan sus coords originales
    CAMPUS_MAP.buildings.forEach((b) => {
      if (!map[b.id]) {
        map[b.id] = { x: b.x * CAMPUS_MAP.width, y: b.y * CAMPUS_MAP.height };
      }
    });

    return map;
  }, [CAMPUS_MAP.buildings, CAMPUS_MAP.width, CAMPUS_MAP.height]);
  
  const openReservationModal = (sala: Sala) => {
    const now = new Date();
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    const startTime = new Date(now);
    startTime.setMinutes(roundedMinutes, 0, 0);
    setSelectedSala(sala);
    setReservationForm({
      date: new Date(),
      startTime,
      duration: sala.tiempo_libre_minutos || 60,
      reason: `Edificio sugerido por AURA en ${sala.nombre}`,
    });
    setReservationVisible(true);
  };

  const saveReservation = async () => {
    if (!selectedSala || !user?.id) return;
    setSavingReservation(true);

    try {
      const start = new Date(reservationForm.date);
      start.setHours(reservationForm.startTime.getHours(), reservationForm.startTime.getMinutes(), 0, 0);
      const end = addMinutes(start, reservationForm.duration);
      const fecha = start.toISOString().split("T")[0];
      const hora_inicio = formatTime(start);
      const hora_fin = formatTime(end);

      const { data: reservasDia } = await supabase
        .from("reservas")
        .select("hora_inicio, hora_fin")
        .eq("sala_id", selectedSala.id)
        .eq("fecha", fecha)
        .neq("estado", "cancelada");

      const hayConflicto = (reservasDia || []).some((reserva) => {
        const [hiH, hiM] = reserva.hora_inicio.split(":").map(Number);
        const [hfH, hfM] = reserva.hora_fin.split(":").map(Number);
        const existingStart = new Date(start);
        existingStart.setHours(hiH, hiM, 0, 0);
        const existingEnd = new Date(start);
        existingEnd.setHours(hfH, hfM, 0, 0);
        return start < existingEnd && end > existingStart;
      });

      if (hayConflicto) {
        Alert.alert("Conflicto", "Ese horario ya está reservado. Intenta con otra franja.");
        return;
      }

      const { error } = await supabase.from("reservas").insert({
        usuario_id: user.id,
        sala_id: selectedSala.id,
        fecha,
        hora_inicio,
        hora_fin,
        estado: "activa",
      });

      if (error) throw error;

      // Actualizar el estado de la sala a ocupado
      const { error: updateError } = await supabase
        .from("salas")
        .update({ estado: "ocupado" })
        .eq("id", selectedSala.id);

      if (updateError) throw updateError;

      Alert.alert("Listo", `Reserva confirmada en ${selectedSala.nombre}. AURA la tendrá en cuenta.`);
      setReservationVisible(false);
      await cargarSalas();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo crear la reserva.");
    } finally {
      setSavingReservation(false);
    }
  };

  const renderMap = () => {
    const handleSalaPress = (sala: Sala) => {
      openReservationModal(sala);
    };

    return (
      <View style={styles.mapContainer}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${CAMPUS_MAP.width} ${CAMPUS_MAP.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="rgba(31, 172, 162, 0.4)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(21, 54, 58, 0.8)" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="buildingGradientActive" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="rgba(215, 180, 95, 0.5)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(215, 180, 95, 0.2)" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="salaLibre" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#5bedc7" stopOpacity="1" />
              <Stop offset="100%" stopColor="#1faca2" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="salaPronto" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffd93d" stopOpacity="1" />
              <Stop offset="100%" stopColor="#ffb347" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="salaOcupado" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ff6b6b" stopOpacity="1" />
              <Stop offset="100%" stopColor="#ee5a6f" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Caminos entre edificios - ahora usan posiciones del layout circular cuando existan */}
          {CAMPUS_MAP.buildings.slice(0, -1).map((building, idx) => {
            const next = CAMPUS_MAP.buildings[idx + 1];
            if (!next) return null;
            const p1 = circleLayout[building.id] ?? { x: building.x * CAMPUS_MAP.width, y: building.y * CAMPUS_MAP.height };
            const p2 = circleLayout[next.id] ?? { x: next.x * CAMPUS_MAP.width, y: next.y * CAMPUS_MAP.height };
            return (
              <Path
                key={`path-${building.id}-${next.id}`}
                d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`}
                stroke="rgba(215, 180, 95, 0.12)"
                strokeWidth="1.2"
                strokeDasharray="4,4"
                fill="none"
              />
            );
          })}

          {/* Edificios */}
          {CAMPUS_MAP.buildings.map((building) => {
            const isActive = filters.edificio === building.id;
            const pos = circleLayout[building.id] ?? { x: building.x * CAMPUS_MAP.width, y: building.y * CAMPUS_MAP.height };
            const buildingX = pos.x;
            const buildingY = pos.y;
            const buildingSize = isActive ? 52 : 48;
            const offset = buildingSize / 2;

            const salasEnEdificio = filtered.filter((s) => s.edificio === building.id).length;

            return (
              <G key={building.id}>
                <Rect
                  x={buildingX - offset + 2}
                  y={buildingY - offset + 2}
                  width={buildingSize}
                  height={buildingSize}
                  rx={12}
                  fill="rgba(0, 0, 0, 0.3)"
                />
                <Rect
                  x={buildingX - offset}
                  y={buildingY - offset}
                  width={buildingSize}
                  height={buildingSize}
                  rx={12}
                  fill={isActive ? "url(#buildingGradientActive)" : "url(#buildingGradient)"}
                  stroke={isActive ? "#d7b45f" : "#1faca2"}
                  strokeWidth={isActive ? 3.5 : 2.5}
                  opacity={isActive ? 1 : 0.9}
                />
                <Circle
                  cx={buildingX}
                  cy={buildingY - 8}
                  r={6}
                  fill={isActive ? "#d7b45f" : "#1faca2"}
                  opacity={0.6}
                />

                {/* --- Cambio: mostrar la letra del edificio dentro de un círculo --- */}
                <G>
                  <Circle
                    cx={buildingX}
                    cy={buildingY + 6}
                    r={isActive ? 16 : 14}
                    fill={isActive ? "#d7b45f" : "#1faca2"}
                    opacity={isActive ? 1 : 0.95}
                    stroke="rgba(13,31,35,0.6)"
                    strokeWidth={1}
                  />
                  <SvgText
                    fill={isActive ? "#0d1f23" : "#0d1f23"}
                    fontSize={isActive ? "12" : "11"}
                    fontWeight="700"
                    x={buildingX}
                    y={buildingY + 6}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {building.id}
                  </SvgText>
                </G>

                {salasEnEdificio > 0 && (
                  <G>
                    <Circle
                      cx={buildingX + offset - 8}
                      cy={buildingY - offset + 8}
                      r={10}
                      fill="#0d1f23"
                      stroke={isActive ? "#d7b45f" : "#1faca2"}
                      strokeWidth={1.5}
                    />
                    <SvgText
                      fill={isActive ? "#d7b45f" : "#5bedc7"}
                      fontSize="9"
                      fontWeight="700"
                      x={buildingX + offset - 8}
                      y={buildingY - offset + 12}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {salasEnEdificio}
                    </SvgText>
                  </G>
                )}
              </G>
            );
          })}

          {/* Salones */}
          {filtered.map((sala) => {
            const position = getMapPosition(sala);
            if (!position) return null;

            const isLibre = sala.estado === "libre";
            const isPronto = sala.estado === "pronto";
            const gradientId = isLibre ? "salaLibre" : isPronto ? "salaPronto" : "salaOcupado";
            const pulseRadius = isLibre ? 14 : isPronto ? 12 : 10;
            const mainRadius = isLibre ? 10 : isPronto ? 9 : 8;

            const label = getAbbrev(sala.nombre, 3); // abreviatura para el círculo

            return (
              <G key={sala.id} onPress={() => handleSalaPress(sala)}>
                {isLibre && (
                  <Circle cx={position.x} cy={position.y} r={pulseRadius} fill="url(#salaLibre)" opacity="0.3" />
                )}
                <Circle cx={position.x + 1} cy={position.y + 1} r={mainRadius} fill="rgba(0, 0, 0, 0.4)" />
                <Circle cx={position.x} cy={position.y} r={mainRadius} fill={`url(#${gradientId})`} stroke="#0d1f23" strokeWidth="2" />
                <Circle cx={position.x} cy={position.y} r={mainRadius - 3} fill="rgba(255, 255, 255, 0.2)" />

                {/* --- Cambio: etiqueta compacta en círculo en lugar de rectángulo largo --- */}
                <G>
                  <Circle
                    cx={position.x + 20}
                    cy={position.y - 10}
                    r={12}
                    fill="rgba(13, 31, 35, 0.95)"
                    stroke={isLibre ? "#5bedc7" : isPronto ? "#ffd93d" : "#ff6b6b"}
                    strokeWidth={1}
                  />
                  <SvgText
                    fill={isLibre ? "#5bedc7" : isPronto ? "#ffd93d" : "#ff6b6b"}
                    fontSize="9"
                    fontWeight="700"
                    x={position.x + 20}
                    y={position.y - 10}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {label}
                  </SvgText>
                </G>

                {isLibre && sala.walkingMinutes && (
                  <G>
                    <Circle cx={position.x - 14} cy={position.y - 14} r={8} fill="rgba(13, 31, 35, 0.9)" stroke="#5bedc7" strokeWidth={1.5} />
                    <SvgText fill="#5bedc7" fontSize="8" fontWeight="700" x={position.x - 14} y={position.y - 10} textAnchor="middle" alignmentBaseline="middle">
                      {sala.walkingMinutes}m
                    </SvgText>
                  </G>
                )}
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#d7b45f" />
        <Text style={styles.loadingText}>Detectando salones disponibles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              cargarSalas();
            }}
            tintColor="#d7b45f"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Salones Disponibles</Text>
              <Text style={styles.subtitle}>
                AURA detecta espacios libres en tiempo real
              </Text>
            </View>
            <View style={styles.auraIconContainer}>
              <Text style={styles.auraIcon}>✨</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Stat 
              label="Disponibles" 
              value={stats.libres} 
              color="#5bedc7" 
              icon="✓"
              description="Listos ahora"
            />
            <Stat 
              label="Próximos" 
              value={stats.pronto} 
              color="#ffd93d" 
              icon="⏱"
              description="Se liberan pronto"
            />
            <Stat 
              label="Ocupados" 
              value={stats.ocupados} 
              color="#ff6b6b" 
              icon="✕"
              description="En uso"
            />
          </View>

          <TouchableOpacity
            style={styles.misReservasBtn}
            onPress={() => router.push("/home/reservas/reservas")}
          >
            <Text style={styles.misReservasBtnText}>📋 Mis Reservas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.mapHeader}>
            <Text style={styles.sectionTitle}>🗺️ Mapa del Campus</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#5bedc7" }]} />
                <Text style={styles.legendText}>Disponible</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#ffd93d" }]} />
                <Text style={styles.legendText}>Pronto libre</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#ff6b6b" }]} />
                <Text style={styles.legendText}>Ocupado</Text>
              </View>
            </View>
          </View>
          {renderMap()}
          <Text style={styles.mapHint}>
            💡 Los puntos verdes son salones disponibles. Los números en los edificios indican cuántos salones hay visibles.
          </Text>
        </View>

        <SalaFilters
          filters={filters}
          onChange={setFilters}
          edificios={edificiosOptions}
          tipos={tiposOptions}
        />

        {auraSuggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.sectionTitle}>✨ Recomendaciones de AURA</Text>
              <View style={styles.auraBadge}>
                <Text style={styles.auraBadgeText}>IA</Text>
              </View>
            </View>
            {auraSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.title}-${index}`}
                style={styles.suggestionCard}
                activeOpacity={0.8}
              >
                <View style={styles.suggestionIcon}>
                  <Text style={styles.suggestionIconText}>💡</Text>
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>
              📋 Salones Disponibles {filtered.length > 0 && `(${filtered.length})`}
            </Text>
            {filtered.length === 0 && (
              <Text style={styles.emptyHint}>
                No hay salones que coincidan con tus filtros. Intenta ajustar los criterios arriba.
              </Text>
            )}
          </View>
          <SalaList
            salas={filtered}
            onReserve={openReservationModal}
          />
        </View>
      </ScrollView>
      
      <Modal
        transparent
        visible={reservationVisible}
        animationType="slide"
        onRequestClose={() => setReservationVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={{ flex: 1, width: "100%" }}
            contentContainerStyle={{ alignItems: "center", justifyContent: "center", paddingVertical: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reservar Salón</Text>
                <View style={styles.modalSalaInfo}>
                  <Text style={styles.modalSalaName}>{selectedSala?.nombre}</Text>
                  <Text style={styles.modalSalaDetails}>
                    {selectedSala?.edificio ? `Edificio ${selectedSala.edificio}` : "Campus"} · {selectedSala?.tipo || "Salón"}
                    {selectedSala?.capacidad && ` · ${selectedSala.capacidad} puestos`}
                  </Text>
                </View>
              </View>
              <Text style={styles.modalSubtitle}>
                ✨ AURA bloqueará este espacio para todos los estudiantes y lo agregará automáticamente a tu agenda.
              </Text>

              <Text style={styles.modalLabel}>Fecha</Text>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={reservationForm.date}
                  mode="date"
                  onChange={(_, date) => date && setReservationForm((prev) => ({ ...prev, date }))}
                />
              ) : (
                <View>
                  <TouchableOpacity
                    style={styles.androidPickerButton}
                    onPress={() => setShowReservationDatePicker(true)}
                  >
                    <Text style={styles.androidPickerText}>
                      {reservationForm.date.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  {showReservationDatePicker && (
                    <DateTimePicker
                      value={reservationForm.date}
                      mode="date"
                      display="calendar"
                      onChange={(event: any, date?: Date) => {
                        if (event?.type === "dismissed") {
                          setShowReservationDatePicker(false);
                          return;
                        }
                        if (date) setReservationForm((prev) => ({ ...prev, date }));
                        setShowReservationDatePicker(false);
                      }}
                    />
                  )}
                </View>
              )}

              <Text style={styles.modalLabel}>Hora de inicio</Text>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={reservationForm.startTime}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={(_, date) => date && setReservationForm((prev) => ({ ...prev, startTime: date }))}
                />
              ) : (
                <View>
                  <TouchableOpacity
                    style={styles.androidPickerButton}
                    onPress={() => setShowReservationTimePicker(true)}
                  >
                    <Text style={styles.androidPickerText}>
                      {formatTime(reservationForm.startTime)}
                    </Text>
                  </TouchableOpacity>
                  {showReservationTimePicker && (
                    <DateTimePicker
                      value={reservationForm.startTime}
                      mode="time"
                      is24Hour
                      display="default"
                      onChange={(event: any, date?: Date) => {
                        if (event?.type === "dismissed") {
                          setShowReservationTimePicker(false);
                          return;
                        }
                        if (date) setReservationForm((prev) => ({ ...prev, startTime: date }));
                        setShowReservationTimePicker(false);
                      }}
                    />
                  )}
                </View>
              )}

              <Text style={styles.modalLabel}>Duración</Text>
              <View style={styles.durationRow}>
                {[30, 60, 90, 120].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.durationChip,
                      reservationForm.duration === minutes && styles.durationChipActive,
                    ]}
                    onPress={() =>
                      setReservationForm((prev) => ({ ...prev, duration: minutes }))
                    }
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        reservationForm.duration === minutes && styles.durationChipTextActive,
                      ]}
                    >
                      {minutes} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={saveReservation}
                disabled={savingReservation}
              >
                {savingReservation ? (
                  <ActivityIndicator color="#0d1f23" />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirmar reserva</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setReservationVisible(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const Stat = ({ 
  label, 
  value, 
  color, 
  icon, 
  description 
}: { 
  label: string; 
  value: number; 
  color: string;
  icon?: string;
  description?: string;
}) => (
  <View style={[styles.statCard, { borderColor: color }]}>
    {icon && <Text style={styles.statIcon}>{icon}</Text>}
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {description && <Text style={styles.statDescription}>{description}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1f23",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d1f23",
  },
  loadingText: {
    color: "#9bc7b4",
    marginTop: 12,
  },
  header: {
    padding: 24,
    paddingTop: 64,
    backgroundColor: "#0f2326",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    color: "#f3f7f5",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: "#9bc7b4",
    fontSize: 15,
    lineHeight: 20,
  },
  auraIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(215, 180, 95, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(215, 180, 95, 0.3)",
  },
  auraIcon: {
    fontSize: 28,
  },

  /* stats */
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    backgroundColor: "rgba(21, 54, 58, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 6,
    opacity: 0.9,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    color: "#d7b45f",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 0.3,
  },
  statDescription: {
    color: "#9bc7b4",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
    opacity: 0.8,
  },

  /* mis reservas button */
  misReservasBtn: {
    marginTop: 16,
    backgroundColor: "rgba(215, 180, 95, 0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#d7b45f",
  },
  misReservasBtnText: {
    color: "#d7b45f",
    fontWeight: "700",
    fontSize: 15,
  },

  /* map */
  mapHeader: {
    marginBottom: 12,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: "#9bc7b4",
    fontSize: 12,
  },
  mapContainer: {
    height: 380,
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(215, 180, 95, 0.3)",
    overflow: "hidden",
    backgroundColor: "#0a1517",
    elevation: 12,
    shadowColor: "#d7b45f",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    position: "relative",
  },
  mapHint: {
    color: "#9bc7b4",
    fontSize: 12,
    marginTop: 10,
    marginHorizontal: 24,
    textAlign: "center",
    opacity: 0.7,
  },

  /* sections */
  section: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  sectionTitle: {
    color: "#d7b45f",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: "#9bc7b4",
    fontSize: 14,
  },

  /* suggestions */
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  auraBadge: {
    backgroundColor: "rgba(215, 180, 95, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d7b45f",
  },
  auraBadgeText: {
    color: "#d7b45f",
    fontSize: 10,
    fontWeight: "700",
  },
  suggestionCard: {
    backgroundColor: "rgba(21, 54, 58, 0.8)",
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(215, 180, 95, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.2)",
  },
  suggestionIconText: {
    fontSize: 24,
  },
  suggestionContent: {
    flex: 1,
    justifyContent: "center",
  },
  suggestionTitle: {
    color: "#d7b45f",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  suggestionDescription: {
    color: "#9bc7b4",
    fontSize: 14,
    lineHeight: 20,
  },

  /* list */
  listHeader: {
    marginBottom: 12,
  },
  emptyHint: {
    color: "#9bc7b4",
    fontSize: 13,
    marginTop: 8,
    fontStyle: "italic",
  },

  /* modal / reservation */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#0f2326",
    borderRadius: 32,
    padding: 24,
    maxHeight: "85%",
    width: "92%",
    alignSelf: "center",
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.2)",
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    color: "#d7b45f",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalSalaInfo: {
    backgroundColor: "rgba(215, 180, 95, 0.12)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.3)",
  },
  modalSalaName: {
    color: "#f3f7f5",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalSalaDetails: {
    color: "#9bc7b4",
    fontSize: 13,
  },
  modalSubtitle: {
    color: "#9bc7b4",
    marginTop: 8,
    marginBottom: 20,
    fontSize: 13,
    lineHeight: 18,
  },
  modalLabel: {
    color: "#d7b45f",
    marginTop: 16,
    marginBottom: 4,
  },

  /* duration / chips */
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.4)",
    marginRight: 8,
    marginBottom: 8,
  },
  durationChipActive: {
    backgroundColor: "#d7b45f",
    borderColor: "#d7b45f",
  },
  durationChipText: {
    color: "#f3f7f5",
    fontSize: 13,
  },
  durationChipTextActive: {
    color: "#0d1f23",
    fontWeight: "600",
  },

  /* buttons */
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#d7b45f",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#d7b45f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#0d1f23",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.4)",
    alignItems: "center",
    backgroundColor: "rgba(215, 180, 95, 0.05)",
  },
  secondaryButtonText: {
    color: "#f3f7f5",
    fontSize: 15,
  },

  /* android pickers */
  androidPickerButton: {
    backgroundColor: "#1faca2",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.4)",
  },
  androidPickerText: {
    color: "#f3f7f5",
    fontSize: 15,
    fontWeight: "500",
  },
});
