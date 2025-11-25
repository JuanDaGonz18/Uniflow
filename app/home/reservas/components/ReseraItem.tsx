import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Reserva } from "@/types/reservas";

type Props = {
  reserva: Reserva;
  onExtend?: (reserva: Reserva) => void;
  onCancel?: (reserva: Reserva) => void;
  onReassign?: (reserva: Reserva) => void;
};

export default function ReservaItem({ reserva, onExtend, onCancel, onReassign }: Props) {
  const estadoColor =
    reserva.estado === "cancelada"
      ? "#ff6b6b"
      : reserva.estado === "pendiente"
        ? "#ffd93d"
        : "#5bedc7";

  const showExtend = reserva.estado !== "cancelada";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{reserva.salas?.nombre || "Sala"}</Text>
          <Text style={styles.subtitle}>
            {reserva.fecha} · {reserva.hora_inicio} - {reserva.hora_fin}
          </Text>
        </View>
        <View style={[styles.stateBadge, { backgroundColor: estadoColor }]}>
          <Text style={styles.stateText}>{reserva.estado.toUpperCase()}</Text>
        </View>
      </View>

      {reserva.motivo ? <Text style={styles.motivo}>{reserva.motivo}</Text> : null}
      {reserva.recomendacion ? (
        <View style={styles.recommendation}>
          <Ionicons name="sparkles-outline" size={16} color="#d7b45f" />
          <Text style={styles.recommendationText}>{reserva.recomendacion}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {showExtend && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onExtend?.(reserva)}>
            <Text style={styles.actionText}>Extender 30 min</Text>
          </TouchableOpacity>
        )}
        {onReassign && reserva.estado === "activa" && reserva.recomendacion?.includes("reprogramar") && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionAura]}
            onPress={() => onReassign(reserva)}
          >
            <Ionicons name="sparkles-outline" size={16} color="#d7b45f" />
            <Text style={[styles.actionText, styles.actionTextAura]}>Reasignar con AURA</Text>
          </TouchableOpacity>
        )}
        {reserva.estado !== "cancelada" && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDanger]}
            onPress={() => onCancel?.(reserva)}
          >
            <Text style={[styles.actionText, styles.actionTextDanger]}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#15363a",
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: "#f3f7f5",
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    color: "#9bc7b4",
    marginTop: 4,
  },
  stateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stateText: {
    color: "#0d1f23",
    fontSize: 12,
    fontWeight: "700",
  },
  motivo: {
    color: "#f3f7f5",
    marginTop: 12,
  },
  recommendation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  recommendationText: {
    color: "#d7b45f",
    fontSize: 13,
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.5)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionDanger: {
    borderColor: "rgba(255, 107, 107, 0.6)",
  },
  actionText: {
    color: "#f3f7f5",
  },
  actionTextDanger: {
    color: "#ff6b6b",
  },
  actionAura: {
    borderColor: "rgba(215, 180, 95, 0.8)",
    backgroundColor: "rgba(215, 180, 95, 0.1)",
    flexDirection: "row",
    gap: 6,
  },
  actionTextAura: {
    color: "#d7b45f",
  },
});

