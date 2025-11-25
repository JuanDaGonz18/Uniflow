import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal, Platform, ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";


import { useAuth } from "@/contexts/AuthContext";
import { useTimer } from "@/hooks/useTimer";
import { formatTime } from "@/utils/formatTime";
import { supabase } from "@/utils/supabase";

type Prioridad = "alta" | "media" | "baja";

interface Task {
  id: number;
  titulo: string;
  descripcion?: string | null;
  fecha_limite?: string | null;
  duracion_estimada?: number | null;
  prioridad?: Prioridad | null;
  estado?: "pendiente" | "planificada" | "completada";
  bloque_inicio?: string | null;
  bloque_fin?: string | null;
  sala_sugerida_id?: string | null;
}

interface SalaDisponible {
  id: string;
  nombre: string;
  estado: string;
}

const PRIORITY_LABELS: Record<Prioridad, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date(),
    duracion: 60,
    prioridad: "media" as Prioridad,
  });
  const [showDatePickerAndroid, setShowDatePickerAndroid] = useState(false);

  // Temporizador por tarea
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const { seconds: time, running: isRunning, start, pause, reset } = useTimer();

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("tareas")
        .select("*")
        .eq("user_id", user.id)
        .order("fecha_limite", { ascending: true, nullsFirst: false });
      setTasks(data || []);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No pudimos cargar tus tareas.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    const pendientes = tasks.filter((t) => t.estado !== "completada").length;
    const planificadas = tasks.filter((t) => t.bloque_inicio).length;
    const vencidas = tasks.filter(
      (t) => t.fecha_limite && t.fecha_limite < hoy && t.estado !== "completada"
    ).length;
    return { pendientes, planificadas, vencidas };
  }, [tasks]);

  const planificados = useMemo(
    () =>
      tasks
        .filter((t) => t.bloque_inicio)
        .sort((a, b) => (a.bloque_inicio || "").localeCompare(b.bloque_inicio || "")),
    [tasks]
  );

  const crearTarea = async () => {
    if (!user?.id) return;
    if (!form.titulo.trim()) {
      Alert.alert("Ups", "Escribe un título para la tarea");
      return;
    }
    try {
      const fecha_limite = form.fecha.toISOString().split("T")[0];
      const { error } = await supabase.from("tareas").insert({
        user_id: user.id,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || null,
        fecha_limite,
        duracion_estimada: form.duracion,
        prioridad: form.prioridad,
        estado: "pendiente",
      });
      if (error) throw error;
      setShowForm(false);
      setForm({
        titulo: "",
        descripcion: "",
        fecha: new Date(),
        duracion: 60,
        prioridad: "media",
      });
      fetchTasks();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No pudimos crear la tarea.");
    }
  };

  const marcarCompletada = async (task: Task) => {
    try {
      const nuevoEstado = task.estado === "completada" ? "pendiente" : "completada";
      const { error } = await supabase
        .from("tareas")
        .update({
          estado: nuevoEstado,
          bloque_inicio: nuevoEstado === "completada" ? null : task.bloque_inicio,
          bloque_fin: nuevoEstado === "completada" ? null : task.bloque_fin,
        })
        .eq("id", task.id);
      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No pudimos marcar la tarea.");
    }
  };

  // Temporizador: iniciar para una tarea (una activa a la vez)
  const iniciarTimer = (taskId: number) => {
    if (activeTaskId && activeTaskId !== taskId) {
      reset();
    }
    setActiveTaskId(taskId);
    if (!isRunning) start();
  };

  const pausarTimer = () => {
    pause();
  };

  const autoPlanificar = async () => {
    if (!user?.id) return;
    setPlanning(true);
    try {
      const hoy = new Date();
      const targetDays = 3;

      const [horarioRes, reservasRes, salasRes] = await Promise.all([
        supabase
          .from("horario")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("reservas")
          .select("*")
          .eq("usuario_id", user.id)
          .gte("fecha", hoy.toISOString().split("T")[0]),
        supabase.from("salas").select("id, nombre, estado"),
      ]);

      const salasDisponibles: SalaDisponible[] = (salasRes.data || []).filter(
        (sala) => sala.estado === "libre"
      );

      const busyBlocks: { start: Date; end: Date }[] = [];

      (horarioRes.data || []).forEach((clase) => {
        for (let offset = 0; offset < targetDays; offset++) {
          const date = new Date(hoy);
          date.setDate(date.getDate() + offset);
          const dayName = date.toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();
          if (dayName.startsWith(clase.dia.slice(0, 3))) {
            const [h, m] = clase.hora.split(":").map(Number);
            const start = new Date(date);
            start.setHours(h, m, 0, 0);
            const end = new Date(start);
            end.setHours(h + 1, m, 0, 0);
            busyBlocks.push({ start, end });
          }
        }
      });

      (reservasRes.data || []).forEach((reserva) => {
        const start = new Date(`${reserva.fecha}T${reserva.hora_inicio}`);
        const end = new Date(`${reserva.fecha}T${reserva.hora_fin}`);
        busyBlocks.push({ start, end });
      });

      const slots: { start: Date; end: Date; busy: boolean }[] = [];
      for (let day = 0; day < targetDays; day++) {
        const dayStart = new Date(hoy);
        dayStart.setDate(hoy.getDate() + day);
        dayStart.setHours(8, 0, 0, 0);
        for (let minute = 0; minute < 14 * 60; minute += 30) {
          const start = new Date(dayStart);
          start.setMinutes(start.getMinutes() + minute);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + 30);
          const busy = busyBlocks.some((block) => start < block.end && end > block.start);
          slots.push({ start, end, busy });
        }
      }

      const pendientes = tasks
        .filter((task) => task.estado !== "completada")
        .sort((a, b) => {
          const priorityOrder: Record<string, number> = { alta: 0, media: 1, baja: 2 };
          const priorityDiff =
            (priorityOrder[a.prioridad || "media"] ?? 1) -
            (priorityOrder[b.prioridad || "media"] ?? 1);
          if (priorityDiff !== 0) return priorityDiff;
          return (a.fecha_limite || "").localeCompare(b.fecha_limite || "");
        });

      const updates: any[] = [];
      const reservationsToCreate: Array<{
        task: Task;
        start: Date;
        end: Date;
        sala?: SalaDisponible;
      }> = [];

      pendientes.forEach((task) => {
        const duration = task.duracion_estimada || 60;
        const slotsNeeded = Math.ceil(duration / 30);
        let assignedIndex = -1;

        for (let i = 0; i < slots.length; i++) {
          if (slots[i].busy) continue;
          const windowSlots = slots.slice(i, i + slotsNeeded);
          if (windowSlots.length < slotsNeeded) break;
          if (windowSlots.some((slot) => slot.busy)) continue;
          assignedIndex = i;
          windowSlots.forEach((slot) => (slot.busy = true));
          const blockStart = windowSlots[0].start;
          const blockEnd = windowSlots[windowSlots.length - 1].end;
          const sala = salasDisponibles.shift();

          updates.push(
            supabase.from("tareas").update({
              estado: "planificada",
              bloque_inicio: blockStart.toISOString(),
              bloque_fin: blockEnd.toISOString(),
              sala_sugerida_id: sala?.id || null,
            }).eq("id", task.id) // <-- aquí NO usamos .then()
          );

          if (sala) {
            reservationsToCreate.push({ task, start: blockStart, end: blockEnd, sala });
          }
          break;
        }

        if (assignedIndex === -1) {
          console.warn("Sin hueco para", task.titulo);
        }
      });

      await Promise.all(updates);

      await Promise.all(
        reservationsToCreate.map(({ task, start, end, sala }) =>
          supabase.from("reservas").insert({
            usuario_id: user.id,
            sala_id: sala?.id,
            fecha: start.toISOString().split("T")[0],
            hora_inicio: start.toTimeString().slice(0, 5),
            hora_fin: end.toTimeString().slice(0, 5),
            estado: "pendiente",
            motivo: `Bloque para ${task.titulo}`,
          })
        )
      );

      Alert.alert("Listo", "AURA distribuyó tus tareas y reservó salones cuando fue posible.");
      fetchTasks();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No pudimos planificar automáticamente.");
    } finally {
      setPlanning(false);
    }
  };

  const renderTask = (task: Task) => {
    const isLate =
      task.fecha_limite && new Date(task.fecha_limite) < new Date() && task.estado !== "completada";
    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle}>{task.titulo}</Text>
          <View style={[styles.priority, styles[`priority_${task.prioridad || "media"}`]]}>
            <Text style={[styles.priorityText, styles[`priorityText_${task.prioridad || "media"}`]]}>
              {PRIORITY_LABELS[task.prioridad || "media"]}
            </Text>
          </View>
        </View>
        {task.descripcion ? <Text style={styles.taskDescription}>{task.descripcion}</Text> : null}
        <View style={styles.taskMeta}>
          {task.fecha_limite && (
            <Meta icon="calendar-outline" label={new Date(task.fecha_limite).toLocaleDateString()} />
          )}
          {task.duracion_estimada && (
            <Meta icon="time-outline" label={`${task.duracion_estimada} min`} />
          )}
          {task.sala_sugerida_id && (
            <Meta icon="cube-outline" label={`Sala sugerida ${task.sala_sugerida_id}`} />
          )}
        </View>
        {task.bloque_inicio && task.bloque_fin && (
          <View style={styles.planBadge}>
            <Ionicons name="sparkles-outline" size={16} color="#d7b45f" />
            <Text style={styles.planBadgeText}>
              Planificado: {new Date(task.bloque_inicio).toLocaleString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
              {new Date(task.bloque_fin!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        )}

        <View style={styles.taskActions}>
          {/* Mostrar tiempo si esta tarea tiene el timer activo */}
          {activeTaskId === task.id && (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ color: "#f3f7f5", fontSize: 16, marginBottom: 6 }}>
                Tiempo: {formatTime(time)}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            {activeTaskId === task.id && isRunning ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={pausarTimer}>
                <Text style={styles.secondaryBtnText}>Pausar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => iniciarTimer(task.id)}>
                <Text style={styles.secondaryBtnText}>Iniciar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryBtn, isLate && { borderColor: "#ff6b6b" }]}
              onPress={() => marcarCompletada(task)}
            >
              <Text style={styles.secondaryBtnText}>
                {task.estado === "completada" ? "Reabrir" : "Marcar como completada"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#d7b45f" />
        <Text style={styles.loadingText}>Cargando tu plan de estudios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Planificador inteligente</Text>
          <Text style={styles.subtitle}>
            AURA distribuye tus tareas según tiempo disponible, reservas activas y hábitos personales.
          </Text>

          <View style={styles.statsRow}>
            <Stat label="Pendientes" value={stats.pendientes} />
            <Stat label="Planificadas" value={stats.planificadas} />
            <Stat label="Vencidas" value={stats.vencidas} />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={autoPlanificar} disabled={planning}>
            {planning ? (
              <ActivityIndicator color="#0d1f23" />
            ) : (
              <Text style={styles.primaryBtnText}>Planificar con AURA</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.secondaryOutlineBtnText}>Nueva tarea manual</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bloques del día</Text>
          {planificados.length === 0 ? (
            <Text style={styles.sectionSubtitle}>Aún no hay bloques asignados.</Text>
          ) : (
            planificados.map((task) => (
              <View key={task.id} style={styles.timelineItem}>
                <View style={styles.timelineLine} />
                <View>
                  <Text style={styles.timelineHour}>
                    {new Date(task.bloque_inicio!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {new Date(task.bloque_fin!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <Text style={styles.timelineTitle}>{task.titulo}</Text>
                  {task.sala_sugerida_id && (
                    <Text style={styles.timelineNote}>Sala reservada: {task.sala_sugerida_id}</Text>
                  )}
                </View>
              </View>
            ))
)}
        </View>

        <View style={styles.section}>                             
          <Text style={styles.sectionTitle}>Todas tus tareas</Text>
          {tasks.length === 0 ? (
            <Text style={styles.sectionSubtitle}>AURA no detecta tareas pendientes.</Text>
          ) : (
            tasks.map(renderTask)
          )}
        </View>
      </ScrollView>

      <Modal visible={showForm} animationType="slide">
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.modalTitle}>Crear tarea</Text>

          <Text style={styles.modalLabel}>Título</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Laboratorio de Redes"
            placeholderTextColor="#8aa29a"
            value={form.titulo}
            onChangeText={(text) => setForm((prev) => ({ ...prev, titulo: text }))}
          />

          <Text style={styles.modalLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={form.descripcion}
            onChangeText={(text) => setForm((prev) => ({ ...prev, descripcion: text }))}
            placeholder="Detalles para AURA"
            placeholderTextColor="#8aa29a"
          />

          <Text style={styles.modalLabel}>Fecha límite</Text>
          <View style={styles.dateTimePickerContainer}>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={form.fecha}
                mode="date"
                display="spinner"
                onChange={(event: any, date?: Date) => {
                  const selected =
                    date ||
                    (event?.nativeEvent?.timestamp ? new Date(event.nativeEvent.timestamp) : undefined);
                  if (selected) setForm((prev) => ({ ...prev, fecha: selected }));
                }}
                textColor="#f3f7f5"
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.androidPickerButton}
                  onPress={() => setShowDatePickerAndroid(true)}
                >
                  <Text style={styles.androidPickerText}>
                    {form.fecha.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showDatePickerAndroid && (
                  <DateTimePicker
                    value={form.fecha}
                    mode="date"
                    display="calendar"
                    onChange={(event: any, date?: Date) => {
                      if (event?.type === "dismissed") {
                        setShowDatePickerAndroid(false);
                        return;
                      }
                      const selected =
                        date ||
                        (event?.nativeEvent?.timestamp ? new Date(event.nativeEvent.timestamp) : undefined);
                      if (selected) setForm((prev) => ({ ...prev, fecha: selected }));
                      setShowDatePickerAndroid(false);
                    }}
                  />
                )}
              </>
            )}
          </View>

          <Text style={styles.modalLabel}>Duración estimada</Text>
          <View style={styles.durationRow}>
            {[30, 60, 90, 120].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.durationChip,
                  form.duracion === minutes && styles.durationChipActive,
                ]}
                onPress={() => setForm((prev) => ({ ...prev, duracion: minutes }))}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    form.duracion === minutes && styles.durationChipTextActive,
                  ]}
                >
                  {minutes} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.modalLabel}>Prioridad</Text>
          <View style={styles.durationRow}>
            {(["alta", "media", "baja"] as Prioridad[]).map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.durationChip,
                  form.prioridad === priority && styles.durationChipActive,
                ]}
                onPress={() => setForm((prev) => ({ ...prev, prioridad: priority }))}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    form.prioridad === priority && styles.durationChipTextActive,
                  ]}
                >
                  {PRIORITY_LABELS[priority]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={crearTarea}>
            <Text style={styles.primaryBtnText}>Guardar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryOutlineBtn} onPress={() => setShowForm(false)}>
            <Text style={styles.secondaryOutlineBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const Meta = ({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) => (
  <View style={styles.meta}>
    <Ionicons name={icon} size={16} color="#9bc7b4" />
    <Text style={styles.metaText}>{label}</Text>
  </View>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

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
    marginBottom: 6,
  },
  subtitle: {
    color: "#9bc7b4",
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: "#15363a",
    borderRadius: 16,
  },
  statValue: {
    color: "#f3f7f5",
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: "#9bc7b4",
    marginTop: 4,
  },
  primaryBtn: {
    marginTop: 16, // <- corregido
    backgroundColor: "#d7b45f",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#0d1f23",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryOutlineBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.4)",
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryOutlineBtnText: {
    color: "#f3f7f5",
    fontSize: 15,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  sectionTitle: {
    color: "#d7b45f",
    fontSize: 18,
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: "#9bc7b4",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  timelineLine: {
    width: 4,
    backgroundColor: "#d7b45f",
    borderRadius: 4,
  },
  timelineHour: {
    color: "#9bc7b4",
    fontSize: 12,
  },
  timelineTitle: {
    color: "#f3f7f5",
    fontSize: 16,
    fontWeight: "600",
  },
  timelineNote: {
    color: "#9bc7b4",
    fontSize: 13,
    marginTop: 2,
  },
  taskCard: {
    backgroundColor: "#15363a",
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskTitle: {
    color: "#f3f7f5",
    fontSize: 16,
    fontWeight: "600",
  },
  priority: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priority_alta: {
    backgroundColor: "rgba(255, 107, 107, 0.2)",
  },
  priority_media: {
    backgroundColor: "rgba(255, 217, 61, 0.2)",
  },
  priority_baja: {
    backgroundColor: "rgba(91, 237, 199, 0.2)",
  },
  priorityText_alta: {
    color: "#ff6b6b",
  },
  priorityText_media: {
    color: "#ffd93d",
  },
  priorityText_baja: {
    color: "#5bedc7",
  },
  taskDescription: {
    color: "#9bc7b4",
    marginTop: 6,
  },
  taskMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#f3f7f5",
    fontSize: 13,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  planBadgeText: {
    color: "#d7b45f",
    fontSize: 13,
  },
  taskActions: {
    marginTop: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.4)",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#f3f7f5",
  },
  modal: {
    flex: 1,
    backgroundColor: "#0d1f23",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  modalTitle: {
    color: "#f3f7f5",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
  },
  modalLabel: {
    color: "#d7b45f",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#15363a",
    borderRadius: 12,
    padding: 12,
    color: "#f3f7f5",
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
  },
  durationChipActive: {
    backgroundColor: "#d7b45f",
    borderColor: "#d7b45f",
  },
  durationChipText: {
    color: "#f3f7f5",
  },
  durationChipTextActive: {
    color: "#0d1f23",
    fontWeight: "700",
  },
  dateTimePickerContainer: {
    backgroundColor: "#15363a",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  androidPickerButton: {
    padding: 12,
    backgroundColor: "#15363a",
  },
  androidPickerText: {
    color: "#f3f7f5",
  },
});

