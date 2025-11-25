import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type SalaFilterValues = {
  edificio: string;
  tipo: string;
  disponibilidad: "ahora" | "pronto" | "franja";
};

type Props = {
  filters: SalaFilterValues;
  onChange: (values: SalaFilterValues) => void;
  edificios: string[];
  tipos: string[];
};

const availabilityOptions: Array<{ label: string; value: SalaFilterValues["disponibilidad"] }> = [
  { label: "Ahora", value: "ahora" },
  { label: "Próximos libres", value: "pronto" },
  { label: "Franjas largas", value: "franja" },
];

export default function SalaFilters({ filters, onChange, edificios, tipos }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Filtros inteligentes</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Disponibilidad</Text>
        <View style={styles.chipRow}>
          {availabilityOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.disponibilidad === option.value}
              onPress={() => onChange({ ...filters, disponibilidad: option.value })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Edificio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {edificios.map((edificio) => (
              <Chip
                key={edificio}
                label={edificio === "todos" ? "Todos" : `Bloque ${edificio}`}
                selected={filters.edificio === edificio}
                onPress={() => onChange({ ...filters, edificio })}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de sala</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {tipos.map((tipo) => (
              <Chip
                key={tipo}
                label={tipo === "todos" ? "Todos" : tipo}
                selected={filters.tipo === tipo}
                onPress={() => onChange({ ...filters, tipo })}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "rgba(15, 35, 38, 0.6)",
    borderRadius: 24,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  title: {
    color: "#d7b45f",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#9bc7b4",
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.9,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(215, 180, 95, 0.25)",
    backgroundColor: "rgba(21, 54, 58, 0.4)",
  },
  chipSelected: {
    backgroundColor: "#d7b45f",
    borderColor: "#d7b45f",
    shadowColor: "#d7b45f",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: {
    color: "#f3f7f5",
    fontSize: 14,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#0d1f23",
    fontWeight: "700",
  },
});

