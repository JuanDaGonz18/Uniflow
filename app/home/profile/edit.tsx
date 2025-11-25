import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function EditProfile() {
  const [name, setName] = useState("Usuario");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editar perfil</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Guardar cambios</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "white",
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "LibreCaslonDisplay",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontFamily: "LibreCaslonDisplay",
    fontSize: 16,
  },
  button: {
    marginTop: 20,
    backgroundColor: "black",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontFamily: "LibreCaslonDisplay",
    textAlign: "center",
  },
});
