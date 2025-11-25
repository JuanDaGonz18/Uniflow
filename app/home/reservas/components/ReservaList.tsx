import { StyleSheet, Text, View } from "react-native";

import type { Reserva } from "@/types/reservas";

import ReservaItem from "./ReseraItem";

type Props = {
  title: string;
  emptyText: string;
  reservas: Reserva[];
  onExtend?: (reserva: Reserva) => void;
  onCancel?: (reserva: Reserva) => void;
  onReassign?: (reserva: Reserva) => void;
};

export default function ReservaList({ title, emptyText, reservas, onExtend, onCancel, onReassign }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {reservas.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        reservas.map((reserva) => (
          <ReservaItem
            key={reserva.id}
            reserva={reserva}
            onExtend={onExtend}
            onCancel={onCancel}
            onReassign={onReassign}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    color: "#d7b45f",
    fontSize: 18,
    marginBottom: 12,
  },
  empty: {
    color: "#9bc7b4",
  },
});

