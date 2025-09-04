import { useAuth } from "@/contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Completa todos los campos.");
      return;
    }

    try {
      // Objeto User mínimo para el registro
      const newUser = {
        id: "", // lo genera Supabase
        email,
        name,
        username: email.split("@")[0], // username automático
        avatar_url: null,
        bio: null,
        website: null,
        location: null,
        birth_date: null, // ⚠️ importante: null, no ""
        phone: null,
        gender: null,
        role: "CLIENT" as const, // según tu default en DB
        points: 0,
        last_active: new Date().toISOString(),
      };

      await register(newUser, password);

      alert("Cuenta creada con éxito 🎉");
      router.replace("/(auth)/login");
    } catch (error: any) {
      alert(error.message || "Error creando la cuenta.");
    }
  };

  return (
    <LinearGradient colors={["#092e20", "#041c13"]} style={styles.background}>
      <View style={styles.container}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          placeholder="Nombre completo"
          placeholderTextColor="#c8d6c4"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="#c8d6c4"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Contraseña"
          placeholderTextColor="#c8d6c4"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Registrarse</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿Ya tienes cuenta?{" "}
          <Text
            style={styles.link}
            onPress={() => router.push("/(auth)/login")}
          >
            Inicia sesión
          </Text>
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 40,
    color: "#FFD700",
    marginBottom: 6,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 15,
    marginBottom: 18,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
  },
  button: {
    width: "100%",
    backgroundColor: "#14532d",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFD700", fontSize: 18 },
  footerText: { marginTop: 20, color: "#c8d6c4", fontSize: 14 },
  link: { color: "#FFD700", textDecorationLine: "underline" },
});
