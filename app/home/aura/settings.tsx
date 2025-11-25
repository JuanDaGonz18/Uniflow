import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

export default function AuraSettings() {
  const [memory, setMemory] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes de AURA</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Memoria del chat</Text>
        <Switch value={memory} onValueChange={setMemory} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "white",
  },
  title: {
    fontSize: 24,
    fontFamily: "LibreCaslonDisplay",
    color: "black",
  },
  row: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 18,
    fontFamily: "LibreCaslonDisplay",
  },
});
