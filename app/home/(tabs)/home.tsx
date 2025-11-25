import HomeCard from "@/app/home/components/ui/HomeCard";
import Section from "@/app/home/components/ui/Section";
import TimelineItem from "@/app/home/components/ui/TimelineItem";
import { useAuth } from "@/contexts/AuthContext";
import { useAuraNotifications } from "@/hooks/useAuraNotifications";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Reserva {
  sala_nombre: string;
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  salas?: { nombre: string };
}

interface Tarea {
  id: number;
  titulo: string;
  fecha_limite: string | null;
}

interface Recordatorio {
  id: number;
  texto: string;
  fecha: string | null;
}

interface Clase {
  id: number;
  materia: string;
  dia: string;
  hora: string;
  hora_fin: string | null;
  salon: string | null;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [proximaClase, setProximaClase] = useState<Clase | null>(null);
  const [salonesLibres, setSalonesLibres] = useState(0);
  const [loading, setLoading] = useState(true);
  const { notifications, loading: loadingNotifs, refresh: refreshNotifs } = useAuraNotifications(user?.id);

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const horaActual = new Date().getHours();
  const saludo = horaActual < 12 ? "Buenos días" : horaActual < 18 ? "Buenas tardes" : "Buenas noches";

  useEffect(() => {
    if (user) {
      cargarDatos();
      refreshNotifs();
    }
  }, [user, refreshNotifs]);

  const cargarDatos = async () => {
    if (!user) return;

    try {
      const hoy = new Date().toISOString().split("T")[0];
      const ahora = new Date();
      const diaActual = ahora.toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();
      const horaActual = ahora.getHours() * 100 + ahora.getMinutes(); // Formato HHMM para comparar

      // Cargar reservas próximas con nombre de sala
      const { data: reservasData } = await supabase
        .from("reservas")
        .select("*, salas(nombre)")
        .eq("usuario_id", user.id)
        .gte("fecha", hoy)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true })
        .limit(5);

      if (reservasData) {
        setReservas(reservasData);
      }

      // Cargar tareas pendientes
      const { data: tareasData } = await supabase
        .from("tareas")
        .select("id, titulo, fecha_limite")
        .eq("user_id", user.id)
        .order("fecha_limite", { ascending: true, nullsFirst: false })
        .limit(10);

      if (tareasData) {
        setTareas(tareasData);
      }

      // Cargar recordatorios próximos
      const { data: recordatoriosData } = await supabase
        .from("recordatorios")
        .select("id, texto, fecha")
        .eq("user_id", user.id)
        .or(`fecha.gte.${hoy},fecha.is.null`)
        .order("fecha", { ascending: true, nullsFirst: false })
        .limit(5);

      if (recordatoriosData) {
        setRecordatorios(recordatoriosData);
      }

      // Cargar horario y encontrar próxima clase
      const { data: horarioData } = await supabase
        .from("horario")
        .select("*")
        .eq("user_id", user.id)
        .order("dia", { ascending: true })
        .order("hora", { ascending: true });

      if (horarioData && horarioData.length > 0) {
        // Mapear días a números para ordenar
        const diasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
        const diaActualNum = diasSemana.indexOf(diaActual);

        // Encontrar la próxima clase
        let proxima: Clase | null = null;
        
        // Buscar en el día actual
        const clasesHoy = horarioData.filter((c) => c.dia === diaActual);
        for (const clase of clasesHoy) {
          const [h, m] = clase.hora.split(":").map(Number);
          const horaClase = h * 100 + m;
          if (horaClase > horaActual) {
            proxima = clase;
            break;
          }
        }

        // Si no hay clase hoy, buscar en los siguientes días
        if (!proxima) {
          for (let i = 1; i < 7; i++) {
            const diaSiguiente = diasSemana[(diaActualNum + i) % 7];
            const clasesDia = horarioData.filter((c) => c.dia === diaSiguiente);
            if (clasesDia.length > 0) {
              proxima = clasesDia[0];
              break;
            }
          }
        }

        setProximaClase(proxima);
      }

      // Contar salones disponibles (estado = 'libre')
      const { count: salonesCount } = await supabase
        .from("salas")
        .select("*", { count: "exact", head: true })
        .eq("estado", "libre");

      setSalonesLibres(salonesCount || 0);
    } catch (err) {
      console.log("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d1f23" }}>
        <ActivityIndicator size="large" color="#d7b45f" />
        <Text style={{ color: "#9bc7b4", marginTop: 12 }}>Cargando tu día...</Text>
      </View>
    );
  }

  const nombreUsuario = user.nombre?.split(" ")[0] || "Estudiante";
  const proximaReserva = reservas[0];
  const tareasCount = tareas.length;
  const tareasHoy = tareas.filter((t) => {
    if (!t.fecha_limite) return false;
    const fechaLimite = new Date(t.fecha_limite);
    const hoy = new Date();
    return fechaLimite.toDateString() === hoy.toDateString();
  });
  const tareasVencidas = tareas.filter((t) => {
    if (!t.fecha_limite) return false;
    return new Date(t.fecha_limite) < new Date();
  });

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {saludo}, {nombreUsuario} 👋
        </Text>

        <Text style={styles.headerSubtitle}>{today}</Text>

        <View style={styles.smartBar}>
          <Text style={styles.smartBarText}>
            {proximaClase
              ? `Próxima clase: ${proximaClase.materia} ${proximaClase.dia} ${proximaClase.hora} · `
              : proximaReserva
              ? `Próxima reserva: ${proximaReserva.hora_inicio} · `
              : ""}
            {tareas.length} {tareas.length === 1 ? "tarea" : "tareas"} ·{" "}
            {salonesLibres} {salonesLibres === 1 ? "salón libre" : "salones libres"}
          </Text>
        </View>
      </View>

      {/* ACCIONES */}
      <Section title="Acciones rápidas">
        <HomeCard title="Buscar salón" icon="search-outline" route="/home/(tabs)/salones" />
        <HomeCard title="Tareas de hoy" icon="checkbox-outline" route="/home/(tabs)/tasks" />
        <HomeCard title="Gestionar reservas" icon="calendar-outline" route="/home/reservas/reservas" />
        <HomeCard title="Hablar con AURA" icon="chatbubble-outline" route="/home/(tabs)/aura" big />
      </Section>

      {/* AURA */}
      <Section title="Tu día con AURA">
        <View style={styles.auraCard}>
          <Text style={styles.auraTitle}>✨ Resumen Inteligente</Text>

          {proximaClase ? (
            <Text style={styles.auraText}>
              📚 Próxima clase: {proximaClase.materia} el {proximaClase.dia.charAt(0).toUpperCase() + proximaClase.dia.slice(1)} a las {proximaClase.hora}
              {proximaClase.hora_fin ? ` - ${proximaClase.hora_fin}` : ""}
              {proximaClase.salon ? ` (${proximaClase.salon})` : ""}
            </Text>
          ) : proximaReserva ? (
            <>
              <Text style={styles.auraText}>
                📅 Próxima reserva: {proximaReserva.salas?.nombre || "Sala"} a las {proximaReserva.hora_inicio}
              </Text>
              <Text style={styles.auraText}>
                ⏰ Duración: {proximaReserva.hora_inicio} - {proximaReserva.hora_fin}
              </Text>
            </>
          ) : (
            <Text style={styles.auraText}>
              📅 No tienes actividades programadas para hoy
            </Text>
          )}

          {tareasVencidas.length > 0 && (
            <Text style={[styles.auraText, { color: "#ff6b6b" }]}>
              ⚠️ {tareasVencidas.length} {tareasVencidas.length === 1 ? "tarea vencida" : "tareas vencidas"}
            </Text>
          )}

          {tareasHoy.length > 0 && (
            <Text style={[styles.auraText, { color: "#ffd93d" }]}>
              📋 {tareasHoy.length} {tareasHoy.length === 1 ? "tarea para hoy" : "tareas para hoy"}
            </Text>
          )}

          {tareas.length > 0 && tareasVencidas.length === 0 && tareasHoy.length === 0 && (
            <Text style={styles.auraText}>
              ✅ Tienes {tareas.length} {tareas.length === 1 ? "tarea pendiente" : "tareas pendientes"}
            </Text>
          )}

          {tareas.length === 0 && (
            <Text style={styles.auraText}>
              🎉 ¡Excelente! No tienes tareas pendientes
            </Text>
          )}

          {recordatorios.length > 0 && (
            <Text style={styles.auraText}>
              🔔 {recordatorios.length} {recordatorios.length === 1 ? "recordatorio próximo" : "recordatorios próximos"}
            </Text>
          )}

          {salonesLibres > 0 ? (
            <Text style={styles.auraText}>
              🏫 Hay {salonesLibres} {salonesLibres === 1 ? "salón disponible" : "salones disponibles"} ahora
            </Text>
          ) : (
            <Text style={styles.auraText}>
              💡 Sugerencia: Revisa las reservas para encontrar espacios libres
            </Text>
          )}
        </View>
      </Section>

      {/* TIMELINE */}
      <Section title="Próximas actividades">
        {reservas.length > 0 ? (
          reservas.slice(0, 3).map((reserva, index) => (
            <TimelineItem
              key={reserva.id}
              hour={reserva.hora_inicio}
              text={`Reserva: ${reserva.sala_nombre || "Sala"} (${reserva.hora_inicio} - ${reserva.hora_fin})`}
              highlight={index === 0}
            />
          ))
        ) : (
          <>
            <TimelineItem hour="--:--" text="No hay actividades programadas" />
            <TimelineItem hour="13:00" text="Estudiar 45 min — Sugerido por AURA" />
          </>
        )}
        {tareasCount > 0 && (
          <TimelineItem hour="Ahora" text={`Completar ${tareasCount} ${tareasCount === 1 ? "tarea pendiente" : "tareas pendientes"}`} highlight />
        )}
      </Section>

      <Section title="Alertas inteligentes de AURA">
        {loadingNotifs ? (
          <View style={styles.notificationsLoading}>
            <ActivityIndicator color="#d7b45f" />
            <Text style={styles.notificationsLoadingText}>Calculando notificaciones predictivas...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <Text style={styles.notificationsEmpty}>AURA no tiene alertas por ahora. Te avisaré si algo cambia.</Text>
        ) : (
          notifications.slice(0, 4).map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={styles.notificationCard}
              activeOpacity={0.8}
              onPress={() => notif.action?.route && router.push(notif.action.route)}
            >
              <Text style={styles.notificationType}>{notif.type.toUpperCase()}</Text>
              <Text style={styles.notificationMessage}>{notif.message}</Text>
              <Text style={styles.notificationTime}>
                {notif.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1f23",
  },

  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#10282b",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerTitle: {
    fontSize: 28,
    color: "#f3f7f5",
    fontWeight: "600",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#9bc7b4",
    marginTop: 4,
    textTransform: "capitalize",
  },

  smartBar: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#15363a",
    borderRadius: 14,
  },

  smartBarText: {
    color: "#f3f7f5",
    fontSize: 13,
  },

  auraCard: {
    backgroundColor: "#15363a",
    padding: 20,
    borderRadius: 18,
  },

  auraTitle: {
    color: "#d7b45f",
    fontSize: 16,
    marginBottom: 12,
  },

  auraText: {
    color: "#f3f7f5",
    fontSize: 14,
    marginBottom: 4,
  },
  notificationsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationsLoadingText: {
    color: "#9bc7b4",
    fontSize: 13,
  },
  notificationsEmpty: {
    color: "#9bc7b4",
    fontSize: 14,
  },
  notificationCard: {
    backgroundColor: "#15363a",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  notificationType: {
    color: "#d7b45f",
    fontSize: 12,
    marginBottom: 4,
  },
  notificationMessage: {
    color: "#f3f7f5",
    fontSize: 14,
  },
  notificationTime: {
    color: "#9bc7b4",
    fontSize: 12,
    marginTop: 6,
  },
});
