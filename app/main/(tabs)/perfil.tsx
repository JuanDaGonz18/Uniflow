import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase"; // asegúrate de tener configurado el cliente
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

// Habilitar LayoutAnimation en Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FormState {
  email: string;
  name: string;
  username: string;
  bio: string;
  website: string;
  location: string;
  birth_date: string | null;
  phone: string;
  gender: string;
  password: string;
  avatar_url?: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, saldo, logout, updateUser } = useAuth();

  const [form, setForm] = useState<FormState>({
    email: "",
    name: "",
    username: "",
    bio: "",
    website: "",
    location: "",
    birth_date: null,
    phone: "",
    gender: "",
    password: "",
    avatar_url: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAllInfo, setShowAllInfo] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email ?? "",
        name: user.name ?? "",
        username: user.username ?? "",
        bio: user.bio ?? "",
        website: user.website ?? "",
        location: user.location ?? "",
        birth_date: user.birth_date || null,
        phone: user.phone ?? "",
        gender: user.gender ?? "",
        password: "",
        avatar_url: user.avatar_url ?? "",
      });
    }
  }, [user]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      const { password, ...updates } = form;
      await updateUser({ ...updates, password: password || undefined });
      Alert.alert("✅ Perfil actualizado", "Tus datos se han guardado correctamente.");
      setIsEditing(false);
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err: any) {
      Alert.alert("Error", err.message || "No se pudo actualizar el perfil.");
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0];
      setForm((prev) => ({ ...prev, birth_date: isoDate }));
    }
  };

  const toggleShowAllInfo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllInfo((prev) => !prev);
  };

  const pickImage = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images", // ✅ en lugar de MediaTypeOptions.Images
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });


    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  } catch (err: any) {
    Alert.alert("Error", "No se pudo seleccionar la imagen.");
  }
};

const takePhoto = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images", // ✅ en lugar de MediaTypeOptions.Images
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });



    if (!result.canceled) {
      await uploadImage(result.assets[0].uri);
    }
  } catch (err: any) {
    Alert.alert("Error", "No se pudo tomar la foto.");
  }
};

const uploadImage = async (uri: string) => {
  try {
    if (!user) return;

    // 🔹 Convertimos el archivo a ArrayBuffer
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const fileExt = uri.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error } = await supabase.storage.from("avatars").upload(filePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    await updateUser({ avatar_url: publicUrl });
    setForm((prev) => ({ ...prev, avatar_url: publicUrl }));

    Alert.alert("✅ Éxito", "Imagen de perfil actualizada.");
  } catch (err: any) {
    Alert.alert("Error", err.message || "No se pudo subir la imagen.");
  }
};

  if (!user) {
    return (
      <LinearGradient colors={["#092e20", "#041c13"]} style={styles.background}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={{ color: "#FFD700", marginTop: 10 }}>Cargando perfil...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#092e20", "#041c13"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>👤 Perfil</Text>

        {/* Avatar */}
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {form.avatar_url ? (
            <Image source={{ uri: form.avatar_url }} style={styles.avatar} />
          ) : (
            <Text style={{ color: "#FFD700" }}>Subir foto</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Text style={styles.buttonText}>Tomar Foto</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          {/* Siempre visibles */}
          <Text style={styles.cardTitle}>Nombre:</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnly]}
            value={form.name}
            onChangeText={(text) => handleChange("name", text)}
            editable={isEditing}
          />

          <Text style={styles.cardTitle}>Correo:</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnly]}
            value={form.email}
            onChangeText={(text) => handleChange("email", text)}
            editable={isEditing}
            keyboardType="email-address"
          />

          <Text style={styles.cardTitle}>💰 Saldo actual:</Text>
          <Text style={styles.balance}>${saldo}</Text>

          {/* Información expandida */}
          {showAllInfo && (
            <>
              {(Object.keys(form) as (keyof FormState)[]).map(
                (key) =>
                  !["email", "name", "password", "birth_date", "avatar_url"].includes(key) && (
                    <View key={key}>
                      <Text style={styles.cardTitle}>{key}:</Text>
                      <TextInput
                        style={[styles.input, !isEditing && styles.readOnly]}
                        value={String(form[key] ?? "")}
                        onChangeText={(text) => handleChange(key, text)}
                        editable={isEditing}
                        autoCapitalize="none"
                      />
                    </View>
                  )
              )}

              {/* Fecha de nacimiento */}
              <View>
                <Text style={styles.cardTitle}>Fecha de nacimiento:</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    !isEditing && styles.readOnly,
                    { justifyContent: "center" },
                  ]}
                  onPress={() => isEditing && setShowDatePicker(true)}
                >
                  <Text style={{ color: "#fff" }}>
                    {form.birth_date || "Selecciona tu fecha"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.birth_date ? new Date(form.birth_date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              {isEditing && (
                <>
                  <Text style={styles.cardTitle}>🔒 Nueva contraseña:</Text>
                  <TextInput
                    style={styles.input}
                    value={form.password}
                    onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
                    secureTextEntry
                    placeholder="Nueva contraseña"
                    placeholderTextColor="#c8d6c4"
                    autoCapitalize="none"
                  />
                </>
              )}
            </>
          )}

          {/* Botones dentro de la card */}
          <TouchableOpacity style={styles.button} onPress={toggleShowAllInfo}>
            <Text style={styles.buttonText}>
              {showAllInfo ? "Ocultar información" : "Mostrar más información"}
            </Text>
          </TouchableOpacity>

          {isEditing ? (
            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Guardar Cambios</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#14532d" }]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.buttonText}>Editar Perfil</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.logout]}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login");
          }}
        >
          <Text style={styles.buttonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    color: "#FFD700",
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#FFD700",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", resizeMode: "cover" },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    marginTop: 16,
  },
  cardTitle: { fontSize: 16, color: "#FFD700", marginTop: 10 },
  input: {
    fontSize: 16,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  readOnly: { backgroundColor: "transparent", borderColor: "transparent" },
  balance: { fontSize: 18, color: "#fff", marginVertical: 10 },
  button: {
    backgroundColor: "#14532d",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFD700", fontSize: 16 },
  logout: { backgroundColor: "#661111", marginTop: 20 },
});
