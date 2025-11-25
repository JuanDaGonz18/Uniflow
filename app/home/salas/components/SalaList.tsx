import { StyleSheet, Text, View } from "react-native";

import { Sala } from "@/types/salas";

import SalaCard from "./SalaCard";

type Props = {
  salas: Sala[];
  onReserve: (sala: Sala) => void;
};

export default function SalaList({ salas, onReserve }: Props) {
  if (salas.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          No hay salas con los filtros seleccionados. Ajusta los criterios o refresca para que AURA detecte otras opciones.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {salas.map((sala) => (
        <SalaCard key={sala.id} sala={sala} onReserve={onReserve} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyStateText: {
    color: "#9bc7b4",
    fontSize: 14,
  },
});

