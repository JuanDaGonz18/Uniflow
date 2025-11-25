import { StyleSheet, Text, View } from "react-native";

export default function AuraHistory() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial de AURA</Text>
      <Text style={styles.placeholder}>
        Próximamente podrás ver tus chats anteriores.
      </Text>
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
  placeholder: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "LibreCaslonDisplay",
    color: "#444",
  },
});
