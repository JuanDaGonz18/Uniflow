import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";

type SalaOption = {
  id: string;
  nombre: string;
  edificio?: string | null;
  estado?: string | null;
};

const DURATIONS = [30, 60, 90, 120];

export default function CreateReserva() {
  const { user } = useAuth();
  const router = useRouter();
  const [salas, setSalas] = useState<SalaOption[]>([]);
  const [selectedSala, setSelectedSala] = useState<SalaOption | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [duration, setDuration] = useState(60);
  const [motivo, setMotivo] = useState("Bloque manual");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSalas = async () => {
      try {
        const { data } = await supabase
          .from("salas")
          .select("id, nombre, edificio, estado")
          .order("edificio", { ascending: true });
        setSalas(data || []);
      } catch (error) {
        Alert.alert("Error", "No se pudieron cargar los salones.");
      }
    };
    fetchSalas();
  }, []);

  const guardar = async () => {
    if (!user?.id || !selectedSala) {
      Alert.alert("Falta información", "Selecciona un salón.");
      return;
    }
    setSaving(true);
    try {
      const start = new Date(date);
      start.setHours(time.getHours(), time.getMinutes(), 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + duration);

      const fecha = start.toISOString().split("T")[0];
      const hora_inicio = start.toTimeString().slice(0, 5);
      const hora_fin = end.toTimeString().slice(0, 5);

      const { data: conflictos } = await supabase
        .from("reservas")
        .select("hora_inicio, hora_fin")
        .eq("sala_id", selectedSala.id)
        .eq("fecha", fecha);

      const hayConflicto = (conflictos || []).some((existente) => {
        const startExisting = new Date(`${fecha}T${existente.hora_inicio}`);
        const endExisting = new Date(`${fecha}T${existente.hora_fin}`);
        return start < endExisting && end > startExisting;
      });

      if (hayConflicto) {
        Alert.alert("Sin disponibilidad", "Ese horario ya está reservado.");
        return;
      }

      const { error } = await supabase.from("reservas").insert({
        usuario_id: user.id,
        sala_id: selectedSala.id,
        fecha,
        hora_inicio,
        hora_fin,
        estado: "activa",
        motivo,
      });

      if (error) throw error;
      Alert.alert("Listo", "Reserva creada.");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "No pudimos crear la reserva.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Crear reserva manual</Text>
        <Text style={styles.subtitle}>
          Selecciona un salón y define el bloque que quieres bloquear. AURA lo tendrá en cuenta en tu planificación.
        </Text>

        <Text style={styles.label}>Salones disponibles</Text>
        <View style={styles.salasRow}>
          {salas.map((sala) => (
            <TouchableOpacity
              key={sala.id}
              style={[
                styles.salaChip,
                selectedSala?.id === sala.id && styles.salaChipActive,
              ]}
              onPress={() => setSelectedSala(sala)}
            >
              <Text
                style={[
                  styles.salaChipText,
                  selectedSala?.id === sala.id && styles.salaChipTextActive,
                ]}
              >
                {sala.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Fecha</Text>
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(_, selected) => selected && setDate(selected)}
        />

        <Text style={styles.label}>Hora de inicio</Text>
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour
          onChange={(_, selected) => selected && setTime(selected)}
        />

        <Text style={styles.label}>Duración</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.durationChip,
                duration === minutes && styles.durationChipActive,
              ]}
              onPress={() => setDuration(minutes)}
            >
              <Text
                style={[
                  styles.durationChipText,
                  duration === minutes && styles.durationChipTextActive,
                ]}
              >
                {minutes} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Motivo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Estudio dirigido"
          placeholderTextColor="#9bc7b4"
          value={motivo}
          onChangeText={setMotivo}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={guardar} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#0d1f23" />
          ) : (
            <Text style={styles.primaryBtnText}>Confirmar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1f23",
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: "#f3f7f5",
    fontSize: 24,
    fontWeight: "600",
  },
  subtitle: {
    color: "#9bc7b4",
    marginTop: 6,
  },
  label: {
    color: "#d7b45f",
    marginTop: 18,
    marginBottom: 8,
  },
  salasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  salaChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
  },
  salaChipActive: {
    backgroundColor: "#d7b45f",
    borderColor: "#d7b45f",
  },
  salaChipText: {
    color: "#f3f7f5",
  },
  salaChipTextActive: {
    color: "#0d1f23",
    fontWeight: "700",
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
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
  input: {
    backgroundColor: "#15363a",
    borderRadius: 12,
    padding: 12,
    color: "#f3f7f5",
  },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: "#d7b45f",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#0d1f23",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.4)",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#f3f7f5",
  },
});

