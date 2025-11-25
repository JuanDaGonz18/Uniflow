import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const otherId = id as string; // asegúrate que se use en sendMessage / markAsRead
  const { user } = useAuth();
  const router = useRouter();
  const [other, setOther] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!otherId || !user?.id) {
      if (!user?.id) setLoading(false);
      return;
    }
    loadConversation();
    markAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId, user?.id]);

  const loadConversation = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: u } = await supabase.from("usuarios").select("id,nombre,avatar_url,bio").eq("id", otherId).single();
      setOther(u);

      const { data: msgs, error } = await supabase
        .from("mensajes_directos")
        .select("*")
        .or(
          `and(remitente_id.eq.${user.id},destinatario_id.eq.${otherId}),and(remitente_id.eq.${otherId},destinatario_id.eq.${user.id})`
        )
        .order("fecha_creacion", { ascending: true });

      if (error) throw error;
      setMessages(msgs || []);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err) {
      console.error("Error cargando conversación:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("mensajes_directos")
        .update({ leido: true })
        .eq("destinatario_id", user.id)
        .eq("remitente_id", otherId);
    } catch (err) {
      console.error("Error marcando como leidos:", err);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from("mensajes_directos")
        .insert({
          remitente_id: user.id,
          destinatario_id: otherId,
          contenido: text.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      setMessages((m) => [...m, data]);
      setText("");
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    }
  };

  // small helper
  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0d1f23", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#d7b45f" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 80 : 0}
      style={styles.container}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowProfileModal(true)}>
          {other?.avatar_url ? (
            <Image source={{ uri: other.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>{(other?.nombre || "U")[0]}</Text>
            </View>
          )}
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.headerName}>{other?.nombre || "Usuario"}</Text>
            {other?.bio ? <Text style={styles.headerSubtitle}>{other.bio}</Text> : null}
          </View>
        </TouchableOpacity>
      </View>

      {/* MENSAJES */}
      <FlatList
        ref={flatRef as any}
        data={messages}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const mine = item.remitente_id === user?.id;
          return (
            <View style={[styles.messageRow, mine ? styles.messageRowRight : styles.messageRowLeft]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>{item.contenido}</Text>
                <Text style={[styles.timeText, mine ? styles.timeTextMine : styles.timeTextOther]}>{formatTime(item.fecha_creacion)}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* COMPOSER */}
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#9bc7b4"
          multiline
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* PERFIL MODAL */}
      <Modal visible={showProfileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: "center" }}>
              {other?.avatar_url ? (
                <Image source={{ uri: other.avatar_url }} style={styles.modalAvatar} />
              ) : (
                <View style={styles.modalAvatarPlaceholder}>
                  <Text style={styles.modalAvatarInitial}>{(other?.nombre || "U")[0]}</Text>
                </View>
              )}
              <Text style={styles.modalName}>{other?.nombre}</Text>
              {other?.bio ? <Text style={styles.modalBio}>{other.bio}</Text> : null}
            </View>

            <View style={{ marginTop: 16 }}>
              <TouchableOpacity style={styles.modalAction} onPress={() => { setShowProfileModal(false); router.push(`/home/profile/${other?.id ?? ""}`); }}>
                <Text style={styles.modalActionText}>Ver perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalAction, { marginTop: 8 }]} onPress={() => { setShowProfileModal(false); router.push(`/home/chat/${other?.id}`); }}>
                <Text style={styles.modalActionText}>Volver al chat</Text>
              </TouchableOpacity>

              <Pressable onPress={() => setShowProfileModal(false)} style={({ pressed }) => [{ marginTop: 12, alignSelf: "center", padding: 8 }, pressed && { opacity: 0.7 }]}>
                <Text style={{ color: "#9bc7b4" }}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071718" },
  header: { padding: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.03)" },
  back: { color: "#d7b45f", fontWeight: "700", fontSize: 16, marginRight: 8 },
  headerInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(215,180,95,0.12)" },
  headerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#d7b45f", alignItems: "center", justifyContent: "center" },
  headerAvatarInitial: { color: "#0d1f23", fontWeight: "700" },
  headerName: { color: "#f3f7f5", fontWeight: "800" },
  headerSubtitle: { color: "#9bc7b4", fontSize: 12 },

  messageRow: { marginVertical: 6, flexDirection: "row", alignItems: "flex-end" },
  messageRowLeft: { justifyContent: "flex-start" },
  messageRowRight: { justifyContent: "flex-end" },

  bubble: { maxWidth: "80%", padding: 10, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  bubbleMine: { backgroundColor: "#d7b45f", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#0f3a3a", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },

  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: "#0d1f23" },
  bubbleTextOther: { color: "#f3f7f5" },

  timeText: { marginTop: 6, fontSize: 10, opacity: 0.8 },
  timeTextMine: { color: "#07302b", textAlign: "right" },
  timeTextOther: { color: "rgba(255,255,255,0.6)", textAlign: "right" },

  composer: { flexDirection: "row", padding: 8, gap: 8, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.03)", backgroundColor: "#071718" },
  input: { flex: 1, backgroundColor: "#0f3a3a", color: "#f3f7f5", padding: 10, borderRadius: 12, maxHeight: 120 },
  sendBtn: { backgroundColor: "#d7b45f", padding: 10, borderRadius: 10, marginLeft: 6 },
  sendBtnText: { color: "#0d1f23", fontWeight: "800" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: "#0d1f23", borderRadius: 12, padding: 18, borderWidth: 1, borderColor: "rgba(215,180,95,0.08)" },
  modalAvatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  modalAvatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#d7b45f", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalAvatarInitial: { color: "#0d1f23", fontWeight: "800", fontSize: 28 },
  modalName: { color: "#f3f7f5", fontWeight: "800", fontSize: 18 },
  modalBio: { color: "#9bc7b4", marginTop: 6 },
  modalAction: { backgroundColor: "#15363a", padding: 12, borderRadius: 10, alignItems: "center" },
  modalActionText: { color: "#f3f7f5", fontWeight: "700" },
});