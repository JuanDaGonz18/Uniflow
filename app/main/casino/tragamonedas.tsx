import { StyleSheet, Text, View } from "react-native";

export default function Tragamonedas() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hola Mundo - Tragamonedas 🎰</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#041c13",
  },
  text: {
    fontSize: 22,
    color: "#FFD700",
    fontWeight: "bold",
  },
});
