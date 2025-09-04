import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ResetPasswordPage() {
  const { resetPassword, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleReset = async () => {
    if (!email || !newPassword) {
      Alert.alert("Error", "Por favor ingresa correo y nueva contraseña.");
      return;
    }

    try {
      await resetPassword(email, newPassword);
      Alert.alert("✅ Éxito", "Contraseña actualizada correctamente.");
      router.push("/(auth)/login");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>🔑 Restablecer contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo y la nueva contraseña
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo"
          placeholderTextColor="#c8d6c4"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Nueva contraseña"
          placeholderTextColor="#c8d6c4"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Cambiar contraseña</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.linkText}>⬅ Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#041c13", // 👈 mismo fondo verde oscuro que usas en Perfil
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 32,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#FFD700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "CinzelDecorative_400Regular",
    color: "#c8d6c4",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    width: "100%",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  button: {
    backgroundColor: "#14532d",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
    width: "100%",
  },
  buttonDisabled: {
    backgroundColor: "#0f3d22",
  },
  buttonText: {
    color: "#FFD700",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    color: "#FFD700",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    textDecorationLine: "underline",
  },
});
