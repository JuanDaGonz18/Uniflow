import { AuthContext } from "@/contexts/AuthContext";
import { CinzelDecorative_400Regular } from "@expo-google-fonts/cinzel-decorative";
import { PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { Poppins_400Regular, Poppins_600SemiBold, useFonts } from "@expo-google-fonts/poppins";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    CinzelDecorative_400Regular,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const router = useRouter();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    // Cargar datos guardados
    const loadCredentials = async () => {
      const savedEmail = await AsyncStorage.getItem("email");
      const savedPassword = await AsyncStorage.getItem("password");
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRemember(true);
      }
    };
    loadCredentials();
  }, []);

  if (!fontsLoaded) return null;

  const hacerlogin = async () => {
    if (!email || !password) {
      alert("Por favor ingresa tus credenciales.");
      return;
    }

    try {
      await login(email, password);

      if (remember) {
        await AsyncStorage.setItem("email", email);
        await AsyncStorage.setItem("password", password);
      } else {
        await AsyncStorage.removeItem("email");
        await AsyncStorage.removeItem("password");
      }

      router.replace("/main");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <LinearGradient colors={["#092e20", "#041c13"]} style={styles.background}>
      <View style={styles.container}>
        <MaterialCommunityIcons
          name="crown"
          size={95}
          color="#FFD700"
          style={styles.icon}
        />

        <Text style={styles.title}>BetApplication</Text>
        <Text style={styles.subtitle}>Tu suerte comienza aquí 🍀</Text>

        <TextInput
          placeholder="Correo electrónico"
          placeholderTextColor="#c8d6c4"
          style={styles.input}
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

        {/* Switch de Recordarme */}
        <View style={styles.rememberContainer}>
          <Switch
            value={remember}
            onValueChange={setRemember}
            thumbColor={remember ? "#FFD700" : "#f4f3f4"}
            trackColor={{ false: "#767577", true: "#14532d" }}
          />
          <Text style={styles.rememberText}>Recordarme</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={hacerlogin}>
          <Text style={styles.buttonText}>Iniciar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          ¿Nuevo aquí?{" "}
          <Text style={styles.link} onPress={() => router.push("/(auth)/register")}>
            Regístrate
          </Text>
        </Text>

        <Text style={styles.footerText}>
          ¿Olvidaste tu clave?{" "}
          <Text style={styles.link} onPress={() => router.push("/(auth)/reset")}>
            Recuperar
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
  icon: { marginBottom: 20, textShadowColor: "rgba(0,0,0,0.7)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 8 },
  title: { fontSize: 44, fontFamily: "PlayfairDisplay_700Bold", color: "#FFD700", marginBottom: 6, textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 8, letterSpacing: 1 },
  subtitle: { fontSize: 18, fontFamily: "CinzelDecorative_400Regular", color: "#e0e0e0", marginBottom: 35, letterSpacing: 0.5 },
  input: { width: "100%", height: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 15, marginBottom: 18, color: "#fff", fontSize: 16, fontFamily: "Poppins_400Regular", borderWidth: 1, borderColor: "rgba(255,215,0,0.5)" },
  button: { width: "100%", backgroundColor: "#14532d", paddingVertical: 15, borderRadius: 14, alignItems: "center", marginTop: 10, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  buttonText: { color: "#FFD700", fontSize: 18, fontFamily: "Poppins_600SemiBold", letterSpacing: 0.5 },
  footerText: { marginTop: 20, color: "#c8d6c4", fontSize: 14, fontFamily: "Poppins_400Regular" },
  link: { fontFamily: "Poppins_600SemiBold", color: "#FFD700", textDecorationLine: "underline" },
  rememberContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  rememberText: { color: "#c8d6c4", fontFamily: "Poppins_400Regular", marginLeft: 8, fontSize: 14 },
});
