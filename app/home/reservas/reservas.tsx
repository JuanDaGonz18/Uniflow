import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ReservaList from "@/app/home/reservas/components/ReservaList";
import { useAuth } from "@/contexts/AuthContext";
import type { Reserva } from "@/types/reservas";
import { generateRouteSuggestion } from "@/utils/auraRoutes";
import { supabase } from "@/utils/supabase";

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

const parseDate = (reserva: Reserva) => new Date(`${reserva.fecha}T${reserva.hora_inicio}`);

export default function ReservasScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
    } catch (error) {
      console.warn("No se pudo obtener ubicación", error);
    }
  }, []);

  const fetchReservas = useCallback(async () => {
    if (!user?.id) {
      console.warn("No hay usuario autenticado");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log("📦 Cargando reservas del usuario:", user.id);
      
      const { data, error } = await supabase
        .from("reservas")
        .select("*, salas(*)")
        .eq("usuario_id", user.id)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) throw error;

      console.log("✅ Reservas cargadas:", data?.length || 0);

      const enriched = (data || []).map((reserva: Reserva) => {
        const walking =
          DEFAULT_WALKING_TIMES[reserva.salas?.edificio || ""] ||
          (location ? 4 : 5);
        
        const reservaTime = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
        const diffMinutes = (reservaTime.getTime() - Date.now()) / 60000;

        let recomendacion: string | undefined;
        const edificio = reserva.salas?.edificio || null;
        
        if (diffMinutes < walking && diffMinutes > 0) {
          const routeHint = edificio
            ? generateRouteSuggestion(null, edificio, "")
            : null;
          recomendacion = `Estás lejos para llegar a tiempo, AURA sugiere reprogramar o cancelar.${routeHint ? ` ${routeHint}` : ""}`;
        } else if (diffMinutes <= 15 && diffMinutes > 0) {
          const routeHint = edificio
            ? generateRouteSuggestion(null, edificio, "")
            : null;
          recomendacion = `Es momento de salir para llegar a esta reserva.${routeHint ? ` ${routeHint}` : ""}`;
        } else if (reserva.estado === "pendiente") {
          recomendacion = "Reserva confirmada automáticamente por AURA.";
        } else if (diffMinutes < 0 && reserva.estado === "activa") {
          recomendacion = "Tu reserva ya inició. ¿Quieres extenderla si el salón sigue libre?";
        }

        return {
          ...reserva,
          distancia_minutos: walking,
          recomendacion,
        };
      });

      setReservas(enriched);
    } catch (error: any) {
      console.error("❌ Error al cargar reservas:", error);
      Alert.alert("Error", error?.message || "No pudimos cargar tus reservas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, user?.id]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Cargar reservas cada vez que enfoque la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchReservas();
    }, [fetchReservas])
  );

  const activas = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    return reservas.filter(
      (reserva) => reserva.estado !== "cancelada" && reserva.fecha >= hoy
    );
  }, [reservas]);

  const historial = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    return reservas.filter(
      (reserva) => reserva.estado === "cancelada" || reserva.fecha < hoy
    );
  }, [reservas]);

  const insights = useMemo(() => {
    const list: string[] = [];
    const proximas = activas.slice(0, 3);
    proximas.forEach((reserva) => {
      if (reserva.recomendacion) list.push(reserva.recomendacion);
    });
    if (list.length === 0) list.push("Tus reservas están sincronizadas con tu plan de tareas.");
    return list;
  }, [activas]);

  const cancelarReserva = async (reserva: Reserva) => {
    Alert.alert("Cancelar reserva", "¿Seguro que quieres liberar el salón?", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("reservas")
              .update({ estado: "cancelada" })
              .eq("id", reserva.id);
            if (error) throw error;
            fetchReservas();
          } catch (error: any) {
            Alert.alert("Error", error?.message || "No pudimos cancelar.");
          }
        },
      },
    ]);
  };

  const extenderReserva = async (reserva: Reserva) => {
    try {
      const inicio = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
      const finActual = new Date(`${reserva.fecha}T${reserva.hora_fin}`);
      const nuevoFin = new Date(finActual);
      nuevoFin.setMinutes(nuevoFin.getMinutes() + 30);

      const { data: conflictos } = await supabase
        .from("reservas")
        .select("hora_inicio, hora_fin")
        .eq("sala_id", reserva.sala_id)
        .eq("fecha", reserva.fecha)
        .neq("id", reserva.id)
        .neq("estado", "cancelada");

      const hayConflicto = (conflictos || []).some((item) => {
        const existingStart = new Date(`${reserva.fecha}T${item.hora_inicio}`);
        const existingEnd = new Date(`${reserva.fecha}T${item.hora_fin}`);
        return inicio < existingEnd && nuevoFin > existingStart;
      });

      if (hayConflicto) {
        // AURA sugiere buscar un salón alternativo
        Alert.alert(
          "Sin disponibilidad",
          "Otro estudiante tiene una reserva después. AURA puede buscar un salón alternativo para extender tu sesión.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Buscar alternativo",
              onPress: () => {
                // Redirigir a salones con filtro para el mismo edificio
                router.push(`/home/(tabs)/salones?edificio=${reserva.salas?.edificio || ""}`);
              },
            },
          ]
        );
        return;
      }

      const { error } = await supabase
        .from("reservas")
        .update({ hora_fin: nuevoFin.toTimeString().slice(0, 5) })
        .eq("id", reserva.id);
      if (error) throw error;
      Alert.alert("Listo", "AURA extendió tu reserva automáticamente.");
      fetchReservas();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No pudimos extender la reserva.");
    }
  };

  // Función para reasignar automáticamente reservas con conflictos
  const reasignarReservaAutomaticamente = async (reserva: Reserva) => {
    if (!user?.id) return;
    
    try {
      // Buscar salones libres en el mismo edificio o cercanos
      const edificio = reserva.salas?.edificio || null;
      const { data: salasDisponibles } = await supabase
        .from("salas")
        .select("*")
        .eq("estado", "libre")
        .order("edificio", { ascending: true });

      if (!salasDisponibles || salasDisponibles.length === 0) {
        Alert.alert("Sin opciones", "AURA no encontró salones alternativos disponibles.");
        return;
      }

      // Priorizar salones del mismo edificio
      let salaAlternativa = salasDisponibles.find((s) => s.edificio === edificio);
      if (!salaAlternativa) {
        salaAlternativa = salasDisponibles[0];
      }

      // Verificar que no haya conflicto en la nueva sala
      const { data: conflictos } = await supabase
        .from("reservas")
        .select("hora_inicio, hora_fin")
        .eq("sala_id", salaAlternativa.id)
        .eq("fecha", reserva.fecha)
        .neq("id", reserva.id)
        .neq("estado", "cancelada");

      const inicio = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
      const fin = new Date(`${reserva.fecha}T${reserva.hora_fin}`);
      const hayConflicto = (conflictos || []).some((item) => {
        const existingStart = new Date(`${reserva.fecha}T${item.hora_inicio}`);
        const existingEnd = new Date(`${reserva.fecha}T${item.hora_fin}`);
        return inicio < existingEnd && fin > existingStart;
      });

      if (hayConflicto) {
        Alert.alert("Sin disponibilidad", "AURA no pudo encontrar un salón alternativo sin conflictos.");
        return;
      }

      // Actualizar la reserva con la nueva sala
      const { error } = await supabase
        .from("reservas")
        .update({ sala_id: salaAlternativa.id })
        .eq("id", reserva.id);

      if (error) throw error;

      Alert.alert(
        "Reasignación exitosa",
        `AURA movió tu reserva al salón ${salaAlternativa.nombre} automáticamente.`
      );
      fetchReservas();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No se pudo reasignar la reserva.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#d7b45f" />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
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
              fetchReservas();
            }}
            tintColor="#d7b45f"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Gestión de reservas</Text>
          <Text style={styles.subtitle}>
            AURA se encarga de extender, cancelar y reasignar espacios según tu agenda inteligente.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/home/reservas/create")}
          >
            <Text style={styles.primaryBtnText}>Nueva reserva</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights de AURA</Text>
          {insights.map((insight, index) => (
            <View key={`${insight}-${index}`} style={styles.insightCard}>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        <ReservaList
          title="Activas"
          emptyText="No tienes reservas activas."
          reservas={activas}
          onExtend={extenderReserva}
          onCancel={cancelarReserva}
          onReassign={reasignarReservaAutomaticamente}
        />

        <ReservaList
          title="Historial"
          emptyText="Aún no hay historial."
          reservas={historial}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1f23",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d1f23",
  },
  loadingText: {
    color: "#9bc7b4",
    marginTop: 12,
  },
  header: {
    padding: 24,
    paddingTop: 64,
  },
  title: {
    color: "#f3f7f5",
    fontSize: 26,
    fontWeight: "600",
  },
  subtitle: {
    color: "#9bc7b4",
    marginTop: 6,
  },
  primaryBtn: {
    marginTop: 18,
    backgroundColor: "#d7b45f",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#0d1f23",
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    color: "#d7b45f",
    fontSize: 18,
    marginBottom: 10,
  },
  insightCard: {
    backgroundColor: "#15363a",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  insightText: {
    color: "#f3f7f5",
  },
});

