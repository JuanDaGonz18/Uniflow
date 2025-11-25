import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({
    email: false,
    name: false,
    pass: false,
    confirm: false,
  });

  async function handleRegister() {
    setErrors({ email: false, name: false, pass: false, confirm: false });
    let hasError = false;

    if (!name) {
      setErrors((e) => ({ ...e, name: true }));
      hasError = true;
    }

    if (!email.trim().endsWith("@unisabana.edu.co")) {
  setErrors((e) => ({ ...e, email: true }));
  Alert.alert("Correo inválido", "Debes registrar un correo institucional @unisabana.edu.co");
  return;
}


    if (!pass) {
      setErrors((e) => ({ ...e, pass: true }));
      hasError = true;
    }

    if (pass !== confirm) {
      setErrors((e) => ({ ...e, confirm: true }));
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }

    if (hasError) {
      Alert.alert("Campos incompletos", "Debes llenar todos los campos.");
      return;
    }

    // --- 1) Crear el usuario en AUTH ---
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name },
      },
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      Alert.alert("Error", "No se pudo crear el usuario.");
      return;
    }

    // --- 2) Insertar en tu tabla 'usuarios' ---
    const { error: insertError } = await supabase
      .from("usuarios")
      .insert({
        id: user.id,
        nombre: name,
        correo: email,
      });

    if (insertError) {
      Alert.alert("Error", "No se pudo guardar el usuario en la base de datos.");
      console.log(insertError);
      return;
    }

    Alert.alert(
      "Cuenta creada",
      "Tu cuenta ha sido registrada correctamente."
    );

    router.replace("/auth/login");
  }

  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Crear cuenta</Text>

        <TextInput
          placeholder="Nombre completo"
          placeholderTextColor="#8eb69b"
          style={[styles.input, errors.name && styles.error]}
          value={name}
          onChangeText={(t) => setName(t)}
        />

        <TextInput
          placeholder="Correo institucional"
          placeholderTextColor="#8eb69b"
          style={[styles.input, errors.email && styles.error]}
          value={email}
          onChangeText={(t) => setEmail(t)}
        />

        <View style={{ position: "relative" }}>
          <TextInput
            secureTextEntry={!showPass}
            placeholder="Contraseña"
            placeholderTextColor="#8eb69b"
            style={[styles.input, errors.pass && styles.error]}
            value={pass}
            onChangeText={(t) => setPass(t)}
          />
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            style={styles.showBtn}
          >
            <Text style={styles.showText}>
              {showPass ? "Ocultar" : "Mostrar"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: "relative" }}>
          <TextInput
            secureTextEntry={!showConfirm}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#8eb69b"
            style={[styles.input, errors.confirm && styles.error]}
            value={confirm}
            onChangeText={(t) => setConfirm(t)}
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(!showConfirm)}
            style={styles.showBtn}
          >
            <Text style={styles.showText}>
              {showConfirm ? "Ocultar" : "Mostrar"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleRegister}>
          <Text style={styles.btnText}>Registrarme</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/auth/login")}>
          <Text style={styles.alt}>¿Ya tienes cuenta? Iniciar sesión</Text>
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
    padding: 32,
    borderRadius: 20,
    gap: 18,
  },
  title: {
    color: "white",
    fontSize: 32,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "EB_Garamond",
  },
  input: {
    borderWidth: 1,
    borderColor: "#8eb69b",
    borderRadius: 12,
    padding: 14,
    color: "white",
    fontSize: 18,
    fontFamily: "Newsreader",
  },
  error: {
    borderColor: "red",
  },
  showBtn: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  showText: {
    color: "#8eb69b",
    fontFamily: "Newsreader",
  },
  btn: {
    backgroundColor: "#8eb69b",
    padding: 14,
    borderRadius: 12,
  },
  btnText: {
    textAlign: "center",
    color: "#051f20",
    fontSize: 20,
    fontFamily: "Newsreader",
  },
  alt: {
    textAlign: "center",
    color: "#8eb69b",
    fontSize: 17,
    fontFamily: "Newsreader",
  },
});
