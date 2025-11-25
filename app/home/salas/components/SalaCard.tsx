import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Sala } from "@/types/salas";

const STATE_COLORS: Record<Sala["estado"], string> = {
  libre: "#1faca2",
  ocupado: "#ff6b6b",
  pronto: "#ffd93d",
};

const STATE_LABELS: Record<Sala["estado"], string> = {
  libre: "Disponible",
  ocupado: "Ocupado",
  pronto: "Pronto libre",
};

type Props = {
  sala: Sala;
  onReserve: (sala: Sala) => void;
};

export default function SalaCard({ sala, onReserve }: Props) {
  const canReserve = sala.estado !== "ocupado";

  return (
    <View style={[styles.card, sala.estado === "libre" && styles.cardAvailable]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{sala.nombre}</Text>
            <View style={[styles.statusDot, { backgroundColor: STATE_COLORS[sala.estado] }]} />
          </View>
          <Text style={styles.subtitle}>
            {sala.edificio ? `Bloque ${sala.edificio}` : "Campus"} · {sala.tipo || "Salón"}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATE_COLORS[sala.estado] + "20", borderColor: STATE_COLORS[sala.estado] }]}>
          <Text style={[styles.statusText, { color: STATE_COLORS[sala.estado] }]}>{STATE_LABELS[sala.estado]}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Meta 
          icon="walk-outline" 
          label={`${sala.walkingMinutes ?? 5} min`}
          description="a pie"
        />
        {sala.capacidad && (
          <Meta 
            icon="people-outline" 
            label={`${sala.capacidad}`}
            description="puestos"
          />
        )}
        {sala.tiempo_libre_minutos && (
          <Meta 
            icon="time-outline" 
            label={`${sala.tiempo_libre_minutos} min`}
            description="disponible"
          />
        )}
      </View>

      {sala.estado === "ocupado" && sala.reservado_por ? (
        <View style={[styles.statusInfo, styles.statusInfoOccupied]}>
          <Ionicons name="lock-closed" size={18} color="#ff6b6b" />
          <View style={styles.statusInfoText}>
            <Text style={styles.lockedText}>
              Ocupado por {sala.reservado_por}
            </Text>
            <Text style={styles.lockedSubtext}>Se liberará pronto</Text>
          </View>
        </View>
      ) : sala.estado === "pronto" ? (
        <View style={[styles.statusInfo, styles.statusInfoSoon]}>
          <Ionicons name="time" size={18} color="#ffd93d" />
          <View style={styles.statusInfoText}>
            <Text style={styles.soonText}>
              Se liberará en breve
            </Text>
            <Text style={styles.soonSubtext}>AURA te avisará cuando esté disponible</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.statusInfo, styles.statusInfoAvailable]}>
          <Ionicons name="checkmark-circle" size={18} color="#5bedc7" />
          <View style={styles.statusInfoText}>
            <Text style={styles.availableText}>
              Disponible ahora
            </Text>
            <Text style={styles.availableSubtext}>Perfecto para un bloque de estudio con AURA</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !canReserve && styles.buttonDisabled]}
        onPress={() => onReserve(sala)}
        disabled={!canReserve}
        activeOpacity={0.9}
      >
        <Text style={[styles.buttonText, !canReserve && styles.buttonTextDisabled]}>
          {canReserve ? "Reservar con AURA" : "En uso"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const Meta = ({ 
  icon, 
  label, 
  description 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string;
  description?: string;
}) => (
  <View style={styles.meta}>
    <Ionicons name={icon} size={18} color="#d7b45f" />
    <View style={styles.metaContent}>
      <Text style={styles.metaText}>{label}</Text>
      {description && <Text style={styles.metaDescription}>{description}</Text>}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(21, 54, 58, 0.8)",
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardAvailable: {
    borderColor: "rgba(91, 237, 199, 0.3)",
    backgroundColor: "rgba(21, 54, 58, 0.9)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  title: {
    color: "#f3f7f5",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  subtitle: {
    color: "#9bc7b4",
    fontSize: 14,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  statusText: {
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(215, 180, 95, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.25)",
  },
  metaContent: {
    flexDirection: "column",
  },
  metaText: {
    color: "#f3f7f5",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  metaDescription: {
    color: "#9bc7b4",
    fontSize: 11,
    marginTop: 3,
    opacity: 0.9,
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  statusInfoOccupied: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  statusInfoSoon: {
    backgroundColor: "rgba(255, 217, 61, 0.1)",
    borderColor: "rgba(255, 217, 61, 0.3)",
  },
  statusInfoAvailable: {
    backgroundColor: "rgba(91, 237, 199, 0.1)",
    borderColor: "rgba(91, 237, 199, 0.3)",
  },
  statusInfoText: {
    flex: 1,
  },
  lockedText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  lockedSubtext: {
    color: "#ff6b6b",
    fontSize: 12,
    opacity: 0.8,
  },
  soonText: {
    color: "#ffd93d",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  soonSubtext: {
    color: "#ffd93d",
    fontSize: 12,
    opacity: 0.8,
  },
  availableText: {
    color: "#5bedc7",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  availableSubtext: {
    color: "#5bedc7",
    fontSize: 12,
    opacity: 0.8,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#d7b45f",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#d7b45f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "rgba(215, 180, 95, 0.15)",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#0d1f23",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonTextDisabled: {
    color: "#d7b45f",
    opacity: 0.7,
  },
});

