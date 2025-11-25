import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function PublicProfile() {
  const params = useLocalSearchParams() as { id?: string };
  const otherId = params.id;
  const router = useRouter();

  const [other, setOther] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!otherId) {
      setOther(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("usuarios")
          .select("id,nombre,correo,avatar_url,bio,website,location,phone,birth_date")
          .eq("id", otherId)
          .single();

        if (!mounted) return;
        if (error) {
          console.error("Error fetching profile:", error);
          setOther(null);
        } else {
          setOther(data);
        }
      } catch (err) {
        console.error(err);
        setOther(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [otherId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d7b45f" />
      </View>
    );
  }

  if (!other) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Perfil no encontrado</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        {other.avatar_url ? (
          <Image source={{ uri: other.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(other.nombre || "U")[0]}</Text>
          </View>
        )}

        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={styles.name}>{other.nombre || "Usuario"}</Text>
          {other.bio ? <Text style={styles.bio}>{other.bio}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        {other.correo ? (
          <View style={styles.row}>
            <Text style={styles.label}>Correo</Text>
            <Text style={styles.value}>{other.correo}</Text>
          </View>
        ) : null}

        {other.website ? (
          <View style={styles.row}>
            <Text style={styles.label}>Sitio</Text>
            <Text style={[styles.link]} onPress={() => Linking.openURL(other.website)}>
              {other.website}
            </Text>
          </View>
        ) : null}

        {other.location ? (
          <View style={styles.row}>
            <Text style={styles.label}>Ubicación</Text>
            <Text style={styles.value}>{other.location}</Text>
          </View>
        ) : null}

        {other.phone ? (
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono</Text>
            <Text style={styles.value}>{other.phone}</Text>
          </View>
        ) : null}

        {other.birth_date ? (
          <View style={styles.row}>
            <Text style={styles.label}>Nacimiento</Text>
            <Text style={styles.value}>{new Date(other.birth_date).toLocaleDateString()}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 18 }}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push(`/home/chat/${other.id}`)}
        >
          <Text style={styles.primaryBtnText}>💬 Enviar mensaje</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1f23" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d1f23" },
  notFound: { color: "#f3f7f5", marginBottom: 12 },
  backBtn: { marginTop: 8, backgroundColor: "#10282b", padding: 10, borderRadius: 8 },
  backBtnText: { color: "#d7b45f", fontWeight: "700" },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: "rgba(215,180,95,0.12)" },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#d7b45f", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#0d1f23", fontSize: 32, fontWeight: "800" },
  name: { color: "#f3f7f5", fontSize: 20, fontWeight: "800" },
  bio: { color: "#9bc7b4", marginTop: 6 },

  card: { backgroundColor: "#15363a", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(215,180,95,0.06)" },

  row: { marginBottom: 12 },
  label: { color: "#d7b45f", fontSize: 13, marginBottom: 4 },
  value: { color: "#f3f7f5" },
  link: { color: "#9bc7b4", textDecorationLine: "underline" },

  primaryBtn: { marginTop: 8, backgroundColor: "#d7b45f", padding: 12, borderRadius: 10, alignItems: "center" },
  primaryBtnText: { color: "#0d1f23", fontWeight: "700" },
  secondaryBtn: { marginTop: 10, backgroundColor: "#10282b", padding: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(215,180,95,0.06)" },
  secondaryBtnText: { color: "#d7b45f", fontWeight: "700" },
});