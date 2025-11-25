import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FormState {
  correo: string;
  nombre: string;
  username: string;
  bio: string;
  website: string;
  location: string;
  birth_date: string | null;
  phone: string;
  gender: string;
  password?: string;
  avatar_url?: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [form, setForm] = useState<FormState>({
    correo: "",
    nombre: "",
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
  const [showMore, setShowMore] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stats, setStats] = useState({
    tareasCompletadas: 0,
    reservasActivas: 0,
    horasEstudio: 0,
  });
  const [notificationSettings, setNotificationSettings] = useState({
    clases: true,
    reservas: true,
    tareas: true,
    salones: true,
  });

  // Cargar datos del usuario y estadísticas
  useEffect(() => {
    if (user) {
      setForm({
        correo: user.correo ?? "",
        nombre: user.nombre ?? "",
        username: user.username ?? "",
        bio: user.bio ?? "",
        website: user.website ?? "",
        location: user.location ?? "",
        birth_date: user.birth_date ?? null,
        phone: user.phone ?? "",
        gender: user.gender ?? "",
        password: "",
        avatar_url: user.avatar_url ?? "",
      });
      cargarEstadisticas();
    }
  }, [user]);

  const cargarEstadisticas = async () => {
    if (!user?.id) return;
    try {
      const hoy = new Date().toISOString().split("T")[0];
      
      const [tareasRes, reservasRes] = await Promise.all([
        supabase
          .from("tareas")
          .select("id, estado, duracion_estimada")
          .eq("user_id", user.id),
        supabase
          .from("reservas")
          .select("id, hora_inicio, hora_fin")
          .eq("usuario_id", user.id)
          .gte("fecha", hoy)
          .neq("estado", "cancelada"),
      ]);

      const tareasCompletadas = (tareasRes.data || []).filter((t) => t.estado === "completada").length;
      const reservasActivas = (reservasRes.data || []).length;
      
      // Calcular horas de estudio estimadas (suma de duraciones de tareas completadas)
      const horasEstudio = Math.round(
        ((tareasRes.data || [])
          .filter((t) => t.estado === "completada")
          .reduce((acc, t) => acc + (t.duracion_estimada || 0), 0) / 60) * 10
      ) / 10;

      setStats({
        tareasCompletadas,
        reservasActivas,
        horasEstudio,
      });
    } catch (error) {
      console.warn("Error cargando estadísticas:", error);
    }
  };

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value as any }));
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm((prev) => ({
        ...prev,
        birth_date: selectedDate.toISOString().split("T")[0],
      }));
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Error", "No se pudo seleccionar la imagen.");
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      if (!user) return;

      // Convertimos el archivo a ArrayBuffer
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileExt = uri.split(".").pop() || "jpg";
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

  const handleSave = async () => {
    try {
      const { password, ...updates } = form;

      await updateUser({
        ...updates,
        password: password || undefined,
      });

      setIsEditing(false);
      setForm((prev) => ({ ...prev, password: "" }));

      Alert.alert("Listo", "Perfil actualizado.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const toggleMore = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMore((v) => !v);
  };

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#d7b45f" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header elegante */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil 👤</Text>
        <Text style={styles.headerSubtitle}>{user.nombre || user.correo}</Text>

        {/* ----------------- FOTO DE PERFIL ----------------- */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={pickImage}
          activeOpacity={0.7}
        >
          {form.avatar_url ? (
            <Image source={{ uri: form.avatar_url }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarPlaceholder}>Añadir foto</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ----------------- CARD PRINCIPAL ----------------- */}
      <View style={styles.contentContainer}>
        <View style={styles.card}>
        <Field label="Nombre" value={form.nombre} editable={isEditing} onChange={(v) => handleChange("nombre", v)} />
        <Field label="Correo" value={form.correo} editable={isEditing} onChange={(v) => handleChange("correo", v)} />

        {showMore && (
          <>
            <Field label="Usuario" value={form.username} editable={isEditing} onChange={(v) => handleChange("username", v)} />
            <Field label="Biografía" value={form.bio} editable={isEditing} onChange={(v) => handleChange("bio", v)} />
            <Field label="Sitio web" value={form.website} editable={isEditing} onChange={(v) => handleChange("website", v)} />
            <Field label="Ubicación" value={form.location} editable={isEditing} onChange={(v) => handleChange("location", v)} />
            <Field label="Teléfono" value={form.phone} editable={isEditing} onChange={(v) => handleChange("phone", v)} />
            <Field label="Género" value={form.gender} editable={isEditing} onChange={(v) => handleChange("gender", v)} />

            <Text style={styles.label}>Fecha de nacimiento</Text>
            <TouchableOpacity
              style={[styles.input, { justifyContent: "center" }]}
              onPress={() => isEditing && setShowDatePicker(true)}
            >
              <Text style={{ color: "#f3f7f5" }}>{form.birth_date || "Seleccionar fecha"}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={form.birth_date ? new Date(form.birth_date) : new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <Field
              label="Contraseña"
              value={form.password ?? ""}
              editable={isEditing}
              secure
              onChange={(v) => handleChange("password", v)}
            />
          </>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={toggleMore}>
          <Text style={styles.secondaryBtnText}>
            {showMore ? "Ocultar información" : "Mostrar más información"}
          </Text>
        </TouchableOpacity>

        {isEditing ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnText}>Guardar cambios</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsEditing(true)}>
            <Text style={styles.primaryBtnText}>Editar perfil</Text>
          </TouchableOpacity>
        )}
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.tareasCompletadas}</Text>
              <Text style={styles.statLabel}>Tareas completadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.reservasActivas}</Text>
              <Text style={styles.statLabel}>Reservas activas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.horasEstudio}h</Text>
              <Text style={styles.statLabel}>Horas de estudio</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Configuración de Notificaciones */}
      <View style={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔔 Notificaciones de AURA</Text>
          <Text style={styles.sectionSubtitle}>
            Controla qué tipo de notificaciones quieres recibir
          </Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              setNotificationSettings((prev) => ({ ...prev, clases: !prev.clases }))
            }
          >
            <Text style={styles.settingLabel}>Notificaciones de clases</Text>
            <View
              style={[
                styles.toggle,
                notificationSettings.clases && styles.toggleActive,
              ]}
            >
              <Text style={styles.toggleText}>
                {notificationSettings.clases ? "ON" : "OFF"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              setNotificationSettings((prev) => ({ ...prev, reservas: !prev.reservas }))
            }
          >
            <Text style={styles.settingLabel}>Notificaciones de reservas</Text>
            <View
              style={[
                styles.toggle,
                notificationSettings.reservas && styles.toggleActive,
              ]}
            >
              <Text style={styles.toggleText}>
                {notificationSettings.reservas ? "ON" : "OFF"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              setNotificationSettings((prev) => ({ ...prev, tareas: !prev.tareas }))
            }
          >
            <Text style={styles.settingLabel}>Notificaciones de tareas</Text>
            <View
              style={[
                styles.toggle,
                notificationSettings.tareas && styles.toggleActive,
              ]}
            >
              <Text style={styles.toggleText}>
                {notificationSettings.tareas ? "ON" : "OFF"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              setNotificationSettings((prev) => ({ ...prev, salones: !prev.salones }))
            }
          >
            <Text style={styles.settingLabel}>Notificaciones de salones libres</Text>
            <View
              style={[
                styles.toggle,
                notificationSettings.salones && styles.toggleActive,
              ]}
            >
              <Text style={styles.toggleText}>
                {notificationSettings.salones ? "ON" : "OFF"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            try {
              await logout();
            } catch (err) {
              console.error("Logout failed:", err);
            } finally {
              // Forzar navegación al login (ajusta la ruta si tu ruta es otra)
              router.replace("/auth/login");
            }
          }}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Botón para ir a Mensajes */}
      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/home/social/mensajes")}
        >
          <Text style={styles.primaryBtnText}>💬 Ir a Mensajes</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

/* -------------------- COMPONENTE DE CAMPO -------------------- */

function Field({
  label,
  value,
  editable,
  secure,
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  secure?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.disabledInput]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        secureTextEntry={secure}
        placeholderTextColor="#9bc7b4"
      />
    </>
  );
}

/* -------------------- ESTILOS -------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1f23",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d1f23",
  },
  loadingText: {
    color: "#f3f7f5",
    marginTop: 12,
    fontSize: 14,
  },

  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#10282b",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 28,
    color: "#f3f7f5",
    fontWeight: "600",
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#9bc7b4",
    marginBottom: 20,
    textTransform: "capitalize",
  },

  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#15363a",
    borderWidth: 2,
    borderColor: "#d7b45f",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarPlaceholder: {
    color: "#9bc7b4",
    fontSize: 14,
  },

  contentContainer: {
    padding: 24,
  },

  card: {
    backgroundColor: "#15363a",
    padding: 20,
    borderRadius: 18,
    gap: 6,
  },

  label: {
    fontSize: 14,
    color: "#d7b45f",
    marginTop: 12,
    marginBottom: 4,
  },

  input: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
    borderRadius: 12,
    padding: 12,
    color: "#f3f7f5",
    marginTop: 4,
    fontSize: 14,
  },

  disabledInput: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },

  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#d7b45f",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    color: "#0d1f23",
    fontWeight: "600",
  },

  secondaryBtn: {
    marginTop: 14,
    backgroundColor: "#10282b",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
  },
  secondaryBtnText: {
    color: "#d7b45f",
    fontSize: 15,
  },

  logoutBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
    backgroundColor: "rgba(102, 17, 17, 0.3)",
  },
  logoutText: {
    textAlign: "center",
    color: "#f3f7f5",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#d7b45f",
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#9bc7b4",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(215, 180, 95, 0.1)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
  },
  statValue: {
    fontSize: 24,
    color: "#d7b45f",
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: "#9bc7b4",
    marginTop: 4,
    textAlign: "center",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(215, 180, 95, 0.1)",
  },
  settingLabel: {
    color: "#f3f7f5",
    fontSize: 15,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 107, 107, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.4)",
  },
  toggleActive: {
    backgroundColor: "rgba(91, 237, 199, 0.2)",
    borderColor: "rgba(91, 237, 199, 0.4)",
  },
  toggleText: {
    color: "#f3f7f5",
    fontSize: 12,
    fontWeight: "600",
  },
});
