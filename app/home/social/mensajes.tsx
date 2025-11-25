import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function MensajesList() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (user?.id) loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadConversations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: msgs, error: msgsErr } = await supabase
        .from("mensajes_directos")
        .select(`
          id,
          remitente_id,
          destinatario_id,
          contenido,
          fecha_creacion,
          remitente:remitente_id(id,nombre,avatar_url),
          destinatario:destinatario_id(id,nombre,avatar_url)
        `)
        .or(`remitente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .order("fecha_creacion", { ascending: false });

      if (msgsErr) {
        console.error("Error obteniendo mensajes:", msgsErr);
        setConversations([]);
        return;
      }

      const map = new Map<string, any>();
      (msgs || []).forEach((m: any) => {
        const otherId = m.remitente_id === user.id ? m.destinatario_id : m.remitente_id;
        if (!map.has(otherId)) {
          const other = m.remitente_id === user.id
            ? Array.isArray(m.destinatario) ? m.destinatario[0] : m.destinatario
            : Array.isArray(m.remitente) ? m.remitente[0] : m.remitente;

          map.set(otherId, {
            otherId,
            other,
            lastMessage: m.contenido,
            lastAt: m.fecha_creacion,
            unread: 0,
          });
        }
      });

      const { data: unreadRows, error: unreadErr } = await supabase
        .from("mensajes_directos")
        .select("remitente_id")
        .eq("destinatario_id", user.id)
        .eq("leido", false);

      if (unreadErr) {
        console.error("Error obteniendo no-leídos:", unreadErr);
      } else {
        const unreadMap = new Map<string, number>();
        (unreadRows || []).forEach((r: any) => {
          const rid = r.remitente_id;
          unreadMap.set(rid, (unreadMap.get(rid) || 0) + 1);
        });

        unreadMap.forEach((count, rid) => {
          if (map.has(rid)) map.get(rid).unread = count;
        });
      }

      const convs = Array.from(map.values()).sort((a: any, b: any) => {
        const ta = new Date(a.lastAt).getTime();
        const tb = new Date(b.lastAt).getTime();
        return tb - ta;
      });

      setConversations(convs);
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.other?.nombre || "").toLowerCase();
      const msg = (c.lastMessage || "").toLowerCase();
      return name.includes(q) || msg.includes(q);
    });
  }, [conversations, query]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d7b45f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Buscar personas o mensajes..."
          placeholderTextColor="#9bc7b4"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Lista */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No hay conversaciones</Text>
          <Text style={styles.emptySubtitle}>Inicia una nueva conversación con alguien del descubrimiento.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/home/social/discover")}>
            <Text style={styles.primaryBtnText}>Buscar personas</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.otherId ?? Math.random().toString()}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/home/chat/${item.otherId}`)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <Pressable
                onPress={() => router.push(`/home/profile/${item.otherId}`)}
                style={styles.avatarWrap}
              >
                {item.other?.avatar_url ? (
                  <Image source={{ uri: item.other.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{(item.other?.nombre || "U")[0]}</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.content}>
                <View style={styles.rowTop}>
                  <Text style={styles.name}>{item.other?.nombre || "Usuario"}</Text>
                  <Text style={styles.time}>{formatTime(item.lastAt)}</Text>
                </View>
                <Text numberOfLines={1} style={styles.preview}>
                  {item.lastMessage ?? ""}
                </Text>
              </View>

              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1f23" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d1f23" },
  header: { padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#f3f7f5", fontSize: 20, fontWeight: "800" },
  newBtn: { backgroundColor: "#15363a", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(215,180,95,0.06)" },
  newBtnText: { color: "#d7b45f", fontWeight: "700" },

  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { backgroundColor: "#15363a", color: "#f3f7f5", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(215,180,95,0.06)" },

  row: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 10, backgroundColor: "#15363a", borderRadius: 12 },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: "rgba(215,180,95,0.06)" },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#d7b45f", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#0d1f23", fontWeight: "800", fontSize: 20 },

  content: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: "#f3f7f5", fontWeight: "800", fontSize: 16 },
  time: { color: "#9bc7b4", fontSize: 12 },

  preview: { color: "rgba(243,247,245,0.9)", marginTop: 4 },

  badge: { backgroundColor: "#ff6b6b", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  badgeText: { color: "#fff", fontWeight: "800" },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyTitle: { color: "#f3f7f5", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySubtitle: { color: "#9bc7b4", textAlign: "center", marginBottom: 12 },

  primaryBtn: { backgroundColor: "#d7b45f", padding: 12, borderRadius: 10 },
  primaryBtnText: { color: "#0d1f23", fontWeight: "700" },
});