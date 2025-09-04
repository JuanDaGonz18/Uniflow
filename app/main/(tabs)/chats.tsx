import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Chat {
  id: string;
  user_id: string;
  user_id2: string;
  last_message?: string;
  updated_at: string;
  other_user?: {
    id: string;
    username?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface Profile {
  id: string;
  username?: string;
  email?: string;
  avatar_url?: string;
}

export default function ChatsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  // Cargar chats (con último mensaje)
  const fetchChats = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("chats")
      .select(`
        id,
        user_id,
        user_id2,
        updated_at,
        user1:profiles!chats_user_id_fkey(id, username, email, avatar_url),
        user2:profiles!chats_user_id2_fkey(id, username, email, avatar_url),
        messages(id, text, media, created_at)
      `)
      .or(`user_id.eq.${user.id},user_id2.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error cargando chats:", error);
      setLoading(false);
      return;
    }

    const formatted = (data || []).map((chat: any) => {
      const isUser1 = chat.user_id === user.id;
      const otherUser = isUser1 ? chat.user2 : chat.user1;

      const sortedMessages = (chat.messages || []).sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastMsgObj = sortedMessages?.[0];
      const lastMsg = lastMsgObj
        ? lastMsgObj.media
          ? "[Imagen]"
          : lastMsgObj.text || "Sin mensajes todavía"
        : "Sin mensajes todavía";

      return {
        ...chat,
        last_message: lastMsg,
        other_user: otherUser,
      } as Chat;
    });

    setChats(formatted);
    setLoading(false);
  };

  // Cargar lista de usuarios para crear chat
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url");

    if (error) {
      console.error("Error cargando usuarios:", error);
      return;
    }

    setUsers((data || []).filter((u: Profile) => u.id !== user?.id));
  };

  // Crear chat: evita duplicados (cliente + DB)
  const createChat = async (otherUserId: string) => {
    if (!user) return;

    // 1) Revisa cache local
    const existingLocal = chats.find(
      (c) =>
        (c.user_id === user.id && c.user_id2 === otherUserId) ||
        (c.user_id2 === user.id && c.user_id === otherUserId)
    );
    if (existingLocal) {
      setModalVisible(false);
      router.push(`/chats/${existingLocal.id}`);
      return;
    }

    // 2) Revisa en DB (ambos órdenes)
    const orFilter = `and(user_id.eq.${user.id},user_id2.eq.${otherUserId}),and(user_id.eq.${otherUserId},user_id2.eq.${user.id})`;
    const { data: existingDb, error: errDb } = await supabase
      .from("chats")
      .select("id")
      .or(orFilter)
      .limit(1);

    if (errDb) {
      console.error("Error verificando chat existente:", errDb);
    }

    if (existingDb && existingDb.length > 0) {
      setModalVisible(false);
      fetchChats();
      router.push(`/chats/${existingDb[0].id}`);
      return;
    }

    // 3) Crear nuevo chat
    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: user.id, user_id2: otherUserId }])
      .select()
      .single();

    if (error) {
      console.error("Error creando chat:", error);
      Alert.alert("Error", "No se pudo crear el chat.");
      return;
    }

    setModalVisible(false);
    fetchChats();
    router.push(`/chats/${data.id}`);
  };

  // Eliminar chat (elimina mensajes primero)
  const deleteChat = async (chatId: string) => {
    Alert.alert("Eliminar chat", "¿Eliminar este chat y sus mensajes?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.from("messages").delete().eq("chat_id", chatId);
            await supabase.from("chats").delete().eq("id", chatId);
            setChats((prev) => prev.filter((c) => c.id !== chatId));
          } catch (err: any) {
            console.error("Error eliminando chat:", err);
            Alert.alert("Error", "No se pudo eliminar el chat.");
          }
        },
      },
    ]);
  };

  useEffect(() => {
    fetchChats();
    fetchUsers();

    const subscription = supabase
      .channel("messages-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchChats();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredChats = chats.filter((c) =>
    (c.other_user?.username || c.other_user?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: "#FFD700", marginTop: 10 }}>Cargando chats...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#041c13", paddingTop: 50 }}>
      <Text style={styles.title}>Chats</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar chats..."
        placeholderTextColor="#aaa"
        value={search}
        onChangeText={setSearch}
      />

      {filteredChats.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: "#fff" }}>No tienes chats todavía.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => router.push(`/chats/${item.id}`)}
              onLongPress={() =>
                Alert.alert("Opciones", undefined, [
                  { text: "Abrir", onPress: () => router.push(`/chats/${item.id}`) },
                  { text: "Eliminar", style: "destructive", onPress: () => deleteChat(item.id) },
                  { text: "Cancelar", style: "cancel" },
                ])
              }
            >
              <Image
                source={{ uri: item.other_user?.avatar_url || "https://via.placeholder.com/50" }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle}>
                  {item.other_user?.username || item.other_user?.email}
                </Text>
                <Text style={styles.chatMessage}>{item.last_message}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={{ color: "#041c13", fontSize: 24, fontWeight: "bold" }}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Buscar usuario</Text>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userItem} onPress={() => createChat(item.id)}>
                  <Image source={{ uri: item.avatar_url || "https://via.placeholder.com/50" }} style={styles.avatarSmall} />
                  <Text style={{ color: "#fff", marginLeft: 10 }}>{item.username || item.email}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#fff" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#FFD700", fontSize: 22, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  searchInput: { backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 20, padding: 10, borderRadius: 10, color: "#fff", marginBottom: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#041c13" },
  chatItem: { flexDirection: "row", alignItems: "center", padding: 12, marginHorizontal: 10, marginVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)" },
  chatTitle: { color: "#FFD700", fontSize: 16, fontWeight: "bold" },
  chatMessage: { color: "#fff", marginTop: 4, fontSize: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 10 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  fab: { position: "absolute", right: 20, bottom: 20, backgroundColor: "#FFD700", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", elevation: 5 },
  modalBackground: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)" },
  modalContainer: { width: "85%", backgroundColor: "#041c13", padding: 20, borderRadius: 12, maxHeight: "80%" },
  modalTitle: { color: "#FFD700", fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  userItem: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)" },
  closeButton: { marginTop: 15, alignItems: "center" },
});
