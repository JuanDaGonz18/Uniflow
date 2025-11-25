import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProfileCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar} />
      </View>

      <Text style={styles.name}>Usuario</Text>
      <Text style={styles.email}>correo@ejemplo.com</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/home/profile/edit")}
      >
        <Text style={styles.buttonText}>Editar perfil</Text>
      </TouchableOpacity>
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
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 5,
    alignItems: "center",
  },

  avatarWrapper: {
    marginBottom: 16,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f2f2f2",
    borderWidth: 2,
    borderColor: "#ddd",
  },

  name: {
    fontSize: 26,
    fontFamily: "MEA CULPA",
    color: "black",
    marginTop: 4,
  },

  email: {
    marginTop: 2,
    fontFamily: "LibreCaslonDisplay",
    color: "#666",
  },

  button: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 26,
    backgroundColor: "#fcd34d", // amarillo elegante
    borderRadius: 12,
  },

  buttonText: {
    textAlign: "center",
    color: "black",
    fontFamily: "LibreCaslonDisplay",
    fontSize: 16,
  },
});
