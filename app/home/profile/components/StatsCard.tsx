import { StyleSheet, Text, View } from "react-native";

export default function StatsCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tu actividad</Text>

      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Reservas realizadas</Text>
        <Text style={styles.statValue}>0</Text>
      </View>

      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Salas visitadas</Text>
        <Text style={styles.statValue}>0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    padding: 26,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f1f1f1",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  title: {
    fontSize: 22,
    fontFamily: "MEA CULPA",
    marginBottom: 18,
    color: "black",
  },

  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  statLabel: {
    fontFamily: "LibreCaslonDisplay",
    fontSize: 17,
    color: "#444",
  },

  statValue: {
    fontFamily: "LibreCaslonDisplay",
    fontSize: 17,
    color: "black",
  },
});
