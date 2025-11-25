import { StyleSheet, Text, View } from "react-native";

export default function ConversationList() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Aquí irán las conversaciones guardadas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  text: {
    fontFamily: "LibreCaslonDisplay",
    fontSize: 16,
  },
});
