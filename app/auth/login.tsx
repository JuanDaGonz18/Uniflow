import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const [emailError, setEmailError] = useState(false);
  const [passError, setPassError] = useState(false);
  const [remember, setRemember] = useState(false);


  useEffect(() => {
    async function loadStoredCredentials() {
      try {
        const savedEmail = await AsyncStorage.getItem("saved_email");
        const savedPass = await AsyncStorage.getItem("saved_pass");

        if (savedEmail && savedPass) {
          console.log("Credenciales encontradas, auto-rellenando.");
          setEmail(savedEmail);
          setPass(savedPass);
          setRemember(true);
        }
      } catch (err) {
        console.log("Error cargando credenciales:", err);
      }
    }

    loadStoredCredentials();
  }, []);

  async function handleLogin() {
    console.log("Intentando iniciar sesión:", email);

    setEmailError(false);
    setPassError(false);

    if (!email || !pass) {
      if (!email) setEmailError(true);
      if (!pass) setPassError(true);
      Alert.alert("Campos incompletos", "Debes llenar todos los campos.");
      return;
    }

    if (!email.endsWith("@unisabana.edu.co")) {
      setEmailError(true);
      Alert.alert(
        "Correo inválido",
        "Debes usar tu correo institucional @unisabana.edu.co"
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      console.log("Error en login:", error.message);
      Alert.alert("Error", error.message);
      return;
    }

    console.log("Inicio de sesión exitoso");
    if (remember) {
      try {
        await AsyncStorage.setItem("saved_email", email);
        await AsyncStorage.setItem("saved_pass", pass);
        console.log("Credenciales guardadas correctamente.");
      } catch (err) {
        console.log("Error guardando credenciales:", err);
      }
    } else {
      // Si estaba activado antes y luego lo desactivó
      await AsyncStorage.removeItem("saved_email");
      await AsyncStorage.removeItem("saved_pass");
      console.log("Credenciales eliminadas.");
    }

    Alert.alert("Bienvenido", "Inicio de sesión exitoso.");
    router.replace("/home/(tabs)/home");
  }

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Ingresar</Text>

        <TextInput
          placeholder="Correo institucional"
          placeholderTextColor="#8eb69b"
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setEmailError(false);
          }}
        />

        <TextInput
          secureTextEntry
          placeholder="Contraseña"
          placeholderTextColor="#8eb69b"
          style={[styles.input, passError && styles.inputError]}
          value={pass}
          onChangeText={(t) => {
            setPass(t);
            setPassError(false);
          }}
        />

        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRemember(!remember)}
        >
          <View style={[styles.checkbox, remember && styles.checkboxActive]} />
          <Text style={styles.rememberText}>Recordar usuario</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnText}>Ingresar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/auth/register")}>
          <Text style={styles.alt}>¿No tienes cuenta? Crear una</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051f20",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "85%",
    backgroundColor: "#0b2b26",
    padding: 30,
    borderRadius: 16,
    gap: 16,
  },
  title: {
    color: "white",
    fontSize: 28,
    textAlign: "center",
    fontFamily: "EB_Garamond",
  },
  input: {
    borderWidth: 1,
    borderColor: "#8eb69b",
    borderRadius: 10,
    padding: 12,
    color: "white",
    fontFamily: "Newsreader",
    fontSize: 18,
  },
  inputError: {
    borderColor: "red",
  },
  btn: {
    backgroundColor: "#8eb69b",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  btnText: {
    textAlign: "center",
    color: "#051f20",
    fontFamily: "Newsreader",
    fontSize: 19,
  },
  alt: {
    textAlign: "center",
    color: "#8eb69b",
    fontFamily: "Newsreader",
    fontSize: 18,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rememberText: {
    color: "white",
    fontFamily: "Newsreader",
    fontSize: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#8eb69b",
    borderRadius: 4,
  },
  checkboxActive: {
    backgroundColor: "#8eb69b",
  },
});
