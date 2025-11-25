import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

import { supabase } from "@/utils/supabase";
import { generateRouteSuggestion } from "@/utils/auraRoutes";

// Check if running in Expo Go (where push notifications are not fully supported)
const isExpoGo = Constants.executionEnvironment === "storeClient";

// Lazy import of notifications to avoid loading in Expo Go
let NotificationsModule: typeof import("expo-notifications") | null = null;

const getNotifications = async () => {
  if (isExpoGo) return null;
  if (NotificationsModule) return NotificationsModule;
  
  try {
    NotificationsModule = await import("expo-notifications");
    // Set notification handler once loaded
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    return NotificationsModule;
  } catch (error) {
    console.warn("No se pudo cargar expo-notifications:", error);
    return null;
  }
};

export type PredictiveNotification = {
  id: string;
  type: "clase" | "salon" | "tarea" | "reserva" | "recordatorio";
  message: string;
  scheduledAt: Date;
  action?: {
    label: string;
    route?: string;
  };
  meta?: Record<string, any>;
};

type AuraNotificationSource = {
  tareas: any[];
  reservas: any[];
  horario: any[];
  recordatorios: any[];
  salones: any[];
};

const WEEK_DAYS = ["domingo", "lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado"];

const parseTime = (time?: string | null) => {
  if (!time) return { hours: 0, minutes: 0 };
  const [h, m] = time.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
};

const combineDateTime = (date: string, time: string) => {
  const base = new Date(date);
  const { hours, minutes } = parseTime(time);
  base.setHours(hours, minutes, 0, 0);
  return base;
};

const addMinutes = (date: Date, minutes: number) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
};

const minutesBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 60000);

const normalizeDay = (day: string) => day.toLowerCase().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");

const findNextClass = (horario: any[]) => {
  if (!horario || horario.length === 0) return null;
  const now = new Date();
  const todayIndex = now.getDay();
  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (todayIndex + offset) % 7;
    const dayName = normalizeDay(WEEK_DAYS[dayIndex] || "");
    const clases = horario
      .filter((c) => normalizeDay(c.dia || "") === dayName)
      .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

    for (const clase of clases) {
      const classDate = new Date(now);
      classDate.setDate(now.getDate() + offset);
      const { hours, minutes } = parseTime(clase.hora);
      classDate.setHours(hours, minutes, 0, 0);
      if (classDate > now) {
        return { clase, startDate: classDate };
      }
    }
  }
  return null;
};

const buildNotifications = (source: AuraNotificationSource): PredictiveNotification[] => {
  const now = new Date();
  const notifications: PredictiveNotification[] = [];

  const nextClass = findNextClass(source.horario);
  if (nextClass) {
    const departTime = addMinutes(nextClass.startDate, -12);
    // Extraer edificio del salón si está disponible
    const salonEdificio = nextClass.clase.salon?.charAt(0) || null;
    const routeSuggestion = salonEdificio
      ? generateRouteSuggestion(null, salonEdificio, `Llegarás a tiempo a ${nextClass.clase.materia}.`)
      : null;
    
    let message = `Es hora de salir para ${nextClass.clase.materia}. Llegarás a tiempo si sales antes de ${departTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
    if (routeSuggestion) {
      message += ` ${routeSuggestion}`;
    }
    
    notifications.push({
      id: `clase-${nextClass.clase.id}`,
      type: "clase",
      message,
      scheduledAt: departTime,
      action: { label: "Ver horario", route: "/home/(tabs)/home" },
      meta: nextClass.clase,
    });
  }

  const reservasProximas = source.reservas?.filter((r) => {
    if (!r.fecha || !r.hora_inicio) return false;
    const inicio = combineDateTime(r.fecha, r.hora_inicio);
    const diff = minutesBetween(inicio, now);
    return diff <= 45 && diff >= 5 && r.estado !== "cancelada";
  });

  reservasProximas?.forEach((reserva) => {
    const inicio = combineDateTime(reserva.fecha, reserva.hora_inicio);
    const salida = addMinutes(inicio, -10);
    
    // Agregar sugerencia de ruta si hay información del edificio
    const edificio = reserva.salas?.edificio || null;
    const routeHint = edificio
      ? generateRouteSuggestion(null, edificio, `Tu reserva está en el ${edificio}.`)
      : null;
    
    let message = `Tu reserva en ${reserva.salas?.nombre || "un salón"} inicia a las ${reserva.hora_inicio}.`;
    if (routeHint) {
      message += ` ${routeHint}`;
    }
    message += ` ¿Deseas extenderla o cancelar?`;
    
    notifications.push({
      id: `reserva-${reserva.id}`,
      type: "reserva",
      message,
      scheduledAt: salida,
      action: { label: "Gestionar", route: "/home/reservas/reservas" },
      meta: reserva,
    });
  });

  const reservasPorTerminar = source.reservas?.filter((r) => {
    if (!r.fecha || !r.hora_fin) return false;
    const fin = combineDateTime(r.fecha, r.hora_fin);
    const diff = minutesBetween(fin, now);
    return diff <= 15 && diff >= -5 && r.estado === "activa";
  });

  reservasPorTerminar?.forEach((reserva) => {
    const fin = combineDateTime(reserva.fecha, reserva.hora_fin);
    const aviso = addMinutes(fin, -10);
    notifications.push({
      id: `reserva-end-${reserva.id}`,
      type: "reserva",
      message: `Tu reserva en ${reserva.salas?.nombre || "el salón"} termina en 10 minutos. ¿Quieres extenderla?`,
      scheduledAt: aviso,
      action: { label: "Extender", route: "/home/reservas/reservas" },
      meta: reserva,
    });
  });

  const tareasCriticas = source.tareas
    ?.filter((t) => t.estado !== "completada")
    .filter((t) => {
      if (!t.fecha_limite) return false;
      const fecha = new Date(t.fecha_limite);
      const diff = minutesBetween(fecha, now);
      return diff <= 720 && diff >= -60;
    });

  tareasCriticas?.forEach((tarea) => {
    const fecha = new Date(tarea.fecha_limite);
    notifications.push({
      id: `tarea-${tarea.id}`,
      type: "tarea",
      message: `Bloque sugerido: ${tarea.titulo} antes de las ${fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      scheduledAt: addMinutes(now, 5),
      action: { label: "Ver tareas", route: "/home/(tabs)/tasks" },
      meta: tarea,
    });
  });

  const recordatoriosProximos = source.recordatorios?.filter((r) => {
    if (!r.fecha) return false;
    const fecha = new Date(r.fecha);
    const diffDias = Math.round((fecha.getTime() - now.getTime()) / 86400000);
    return diffDias <= 1;
  });

  recordatoriosProximos?.forEach((recordatorio) => {
    notifications.push({
      id: `recordatorio-${recordatorio.id}`,
      type: "recordatorio",
      message: recordatorio.texto,
      scheduledAt: addMinutes(now, 3),
      action: { label: "Ver agenda", route: "/home/(tabs)/home" },
      meta: recordatorio,
    });
  });

  // Detectar salones que acaban de quedar libres (cambios de estado recientes)
  const salonesLibres = source.salones?.filter((s) => s.estado === "libre");
  if (salonesLibres && salonesLibres.length > 0) {
    // Priorizar salones cercanos a la próxima clase o reserva
    let destacado = salonesLibres[0];
    
    if (nextClass && nextClass.clase.salon) {
      const targetEdificio = nextClass.clase.salon.charAt(0);
      const cercano = salonesLibres.find((s) => s.edificio === targetEdificio);
      if (cercano) {
        destacado = cercano;
      }
    }
    
    const routeHint = destacado.edificio
      ? generateRouteSuggestion(null, destacado.edificio, `Perfecto para un bloque de estudio.`)
      : null;
    
    let message = `${destacado.nombre} está libre por ${destacado.disponible_hasta || "la próxima hora"}.`;
    if (routeHint) {
      message += ` ${routeHint}`;
    } else {
      message += ` ¿Quieres reservarlo?`;
    }
    
    notifications.push({
      id: `salon-${destacado.id}`,
      type: "salon",
      message,
      scheduledAt: addMinutes(now, 2),
      action: { label: "Reservar", route: "/home/(tabs)/salones" },
      meta: destacado,
    });
  }

  return notifications
    .filter((notif) => notif.scheduledAt > addMinutes(now, -2))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
};

const ensurePermissions = async () => {
  // Skip permission requests in Expo Go
  if (isExpoGo) {
    return;
  }

  const notifications = await getNotifications();
  if (!notifications) {
    return;
  }

  const settings = await notifications.getPermissionsAsync();
  if (settings.status !== "granted") {
    const request = await notifications.requestPermissionsAsync();
    if (request.status !== "granted") {
      throw new Error("Permisos de notificaciones denegados");
    }
  }

  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("aura-predictive", {
      name: "AURA Predictive",
      importance: notifications.AndroidImportance.HIGH,
    });
  }
};

export const useAuraNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<PredictiveNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const scheduledIds = useRef<string[]>([]);
  
  // Suppress expo-notifications errors in Expo Go
  useEffect(() => {
    if (isExpoGo) {
      // Override console.error temporarily to suppress the expo-notifications error
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const message = args[0]?.toString() || "";
        if (message.includes("expo-notifications") && message.includes("Expo Go")) {
          // Suppress this specific error in Expo Go
          return;
        }
        originalError.apply(console, args);
      };
      
      return () => {
        console.error = originalError;
      };
    }
  }, []);

  const syncDeviceNotifications = useCallback(async (items: PredictiveNotification[]) => {
    // Skip notification scheduling in Expo Go
    if (isExpoGo) {
      console.log("Notificaciones deshabilitadas en Expo Go. Usa un development build para habilitarlas.");
      return;
    }

    const notifications = await getNotifications();
    if (!notifications) {
      console.warn("expo-notifications no está disponible");
      return;
    }

    try {
      await ensurePermissions();
    } catch (error) {
      console.warn("Permisos de notificaciones no disponibles:", error);
      return;
    }

    await Promise.all(
      scheduledIds.current.map((id) => notifications.cancelScheduledNotificationAsync(id).catch(() => null))
    );
    scheduledIds.current = [];

    const now = new Date();
    for (const item of items) {
      if (item.scheduledAt <= now) continue;
      try {
        const id = await notifications.scheduleNotificationAsync({
          content: {
            title: "AURA",
            body: item.message,
            data: { type: item.type, route: item.action?.route, meta: item.meta },
          },
          trigger: item.scheduledAt,
        });
        scheduledIds.current.push(id);
      } catch (error) {
        console.warn("No se pudo programar notificación:", error);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const [tareasRes, reservasRes, horarioRes, recordatoriosRes, salonesRes] = await Promise.all([
        supabase
          .from("tareas")
          .select("*")
          .eq("user_id", userId)
          .order("fecha_limite", { ascending: true, nullsFirst: false }),
        supabase
          .from("reservas")
          .select("*, salas(nombre, edificio)")
          .eq("usuario_id", userId)
          .gte("fecha", today)
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true }),
        supabase
          .from("horario")
          .select("*")
          .eq("user_id", userId)
          .order("dia", { ascending: true })
          .order("hora", { ascending: true }),
        supabase
          .from("recordatorios")
          .select("*")
          .eq("user_id", userId)
          .gte("fecha", today)
          .order("fecha", { ascending: true, nullsFirst: false })
          .limit(10),
        supabase
          .from("salas")
          .select("*")
          .order("estado", { ascending: true }),
      ]);

      const built = buildNotifications({
        tareas: tareasRes.data || [],
        reservas: reservasRes.data || [],
        horario: horarioRes.data || [],
        recordatorios: recordatoriosRes.data || [],
        salones: salonesRes.data || [],
      });

      setNotifications(built);
      await syncDeviceNotifications(built);
    } catch (error) {
      console.warn("useAuraNotifications :: error", error);
    } finally {
      setLoading(false);
    }
  }, [userId, syncDeviceNotifications]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    return notifications.reduce<Record<PredictiveNotification["type"], PredictiveNotification[]>>((acc, notif) => {
      if (!acc[notif.type]) acc[notif.type] = [];
      acc[notif.type].push(notif);
      return acc;
    }, {} as Record<PredictiveNotification["type"], PredictiveNotification[]>);
  }, [notifications]);

  return {
    notifications,
    groupedNotifications: grouped,
    refresh,
    loading,
  };
};


