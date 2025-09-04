// app/chats/[id].tsx
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string;
  points?: number;
}

interface Message {
  id: string;
  chat_id: string;
  sent_by: string;
  text?: string;
  media?: { type: string; url: string } | null;
  created_at: string;
  profile?: Profile;
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);

  // Info del chat
  const fetchChatInfo = async () => {
    if (!id || !user) return;
    const { data, error } = await supabase
      .from("chats")
      .select(`
        id,
        user_id,
        user_id2,
        user1:profiles!chats_user_id_fkey(id, username, bio, points, avatar_url),
        user2:profiles!chats_user_id2_fkey(id, username, bio, points, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error cargando chat:", error);
      return;
    }
    const isUser1 = data.user_id === user.id;
    const otherUser = isUser1 ? data.user2 : data.user1;
    setChatInfo({ ...data, other_user: otherUser });
  };

  // Mensajes
  const fetchMessages = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(
        `id, chat_id, sent_by, text, media, created_at,
         profiles!messages_sent_by_fkey(id, username, avatar_url)`
      )
      .eq("chat_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando mensajes:", error);
      setLoading(false);
      return;
    }

    const mapped: Message[] = (data || []).map((m: any) => ({
      id: m.id,
      chat_id: m.chat_id,
      sent_by: m.sent_by,
      text: m.text,
      media: m.media,
      created_at: m.created_at,
      profile: m.profiles
        ? {
            id: m.profiles.id,
            username: m.profiles.username,
            avatar_url: m.profiles.avatar_url,
          }
        : undefined,
    }));

    setMessages(mapped);
    setLoading(false);
  };

  // Enviar texto
  const sendText = async () => {
    if (!id || !input.trim() || !user) return;
    setSending(true);
    const text = input.trim();
    const { error, data } = await supabase
      .from("messages")
      .insert([{ chat_id: id, sent_by: user.id, text }])
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      setInput("");
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", id);
    }
    setSending(false);
  };

  // Subir imagen
  const uploadImageToStorage = async (uri: string, path: string) => {
    try {
      const res = await fetch(uri);
      const arrayBuffer = await res.arrayBuffer();
      const { error } = await supabase.storage
        .from("chat-media")
        .upload(path, arrayBuffer, { contentType: "image/png", upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(path);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error("uploadImageToStorage error:", err);
      return null;
    }
  };

  // Elegir imagen
  const pickAndSendImage = async () => {
    if (!id || !user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    setUploading(true);
    const filename = `${id}/${Date.now()}-${user.id}.png`;
    const publicUrl = await uploadImageToStorage(asset.uri, filename);
    setUploading(false);
    if (!publicUrl) return;

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          chat_id: id,
          sent_by: user.id,
          text: "",
          media: { type: "image", url: publicUrl },
        },
      ])
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // Subscripción realtime
  useEffect(() => {
    fetchChatInfo();
    fetchMessages();
    if (!id) return;
    const subscription = supabase
      .channel(`messages-chat-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id, user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#041c13" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerUser} onPress={() => setModalVisible(true)}>
          {chatInfo?.other_user?.avatar_url && (
            <Image source={{ uri: chatInfo.other_user.avatar_url }} style={styles.headerAvatar} />
          )}
          <Text style={styles.headerName}>{chatInfo?.other_user?.username}</Text>
        </TouchableOpacity>
      </View>

      {/* Mensajes */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageRow,
              item.sent_by === user?.id ? styles.messageRowMine : styles.messageRowOther,
            ]}
          >
            {item.sent_by !== user?.id && item.profile?.avatar_url && (
              <Image source={{ uri: item.profile.avatar_url }} style={styles.avatar} />
            )}
            <View style={{ maxWidth: "80%" }}>
              {item.media?.type === "image" ? (
                <TouchableOpacity onPress={() => setImageModal(item.media?.url || null)}>
                  <Image source={{ uri: item.media.url }} style={styles.messageImage} />
                </TouchableOpacity>
              ) : (
                <Text style={styles.messageText}>{item.text}</Text>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      />

      {/* Composer */}
      <View style={styles.composer}>
        <TouchableOpacity style={styles.iconButton} onPress={pickAndSendImage}>
          <Ionicons name="image" size={24} color="#FFD700" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#aaa"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendText} disabled={sending}>
          <Ionicons name="send" size={20} color="#041c13" />
        </TouchableOpacity>
      </View>

      {/* Modal perfil */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {chatInfo?.other_user?.avatar_url && (
              <Image source={{ uri: chatInfo.other_user.avatar_url }} style={styles.modalAvatar} />
            )}
            <Text style={styles.modalName}>{chatInfo?.other_user?.username}</Text>
            <Text style={styles.modalBio}>{chatInfo?.other_user?.bio || "Sin bio"}</Text>
            <Text style={styles.modalPoints}>
              ${chatInfo?.other_user?.points?.toLocaleString("es-CO") || "0"} COP
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#fff" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal imagen */}
      <Modal visible={!!imageModal} transparent animationType="fade">
        <TouchableOpacity style={styles.imageModal} onPress={() => setImageModal(null)}>
          {imageModal && <Image source={{ uri: imageModal }} style={styles.fullImage} />}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#041c13" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#062c1d",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: { marginRight: 12 },
  headerUser: { flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  headerName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  messageRow: { flexDirection: "row", marginVertical: 6, alignItems: "flex-end" },
  messageRowMine: { alignSelf: "flex-end" },
  messageRowOther: { alignSelf: "flex-start" },
  messageText: { color: "#fff", backgroundColor: "#333", padding: 8, borderRadius: 8 },
  messageImage: { width: 200, height: 150, borderRadius: 8, resizeMode: "cover" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#041c13",
  },
  iconButton: { padding: 8 },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    color: "#fff",
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#062c1d",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
  },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  modalName: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 8 },
  modalBio: { color: "#ccc", marginBottom: 6, textAlign: "center" },
  modalPoints: { color: "#FFD700", marginBottom: 16 },
  closeButton: {
    backgroundColor: "#333",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "90%", height: "70%", resizeMode: "contain" },
});
