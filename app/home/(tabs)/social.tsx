import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface Amigo {
  id: string;
  nombre: string;
  avatar_url?: string;
  estado: string;
  descripcion?: string;
  ubicacion?: string;
}

interface Recomendacion {
  id: string;
  usuario_recomendado_id: string;
  tipo: string;
  compatibilidad_porcentaje: number;
  razon: string;
  usuarios?: { id: string; nombre: string; avatar_url?: string };
}

interface UsuarioDescubrir {
  id: string;
  nombre: string;
  avatar_url?: string;
  bio?: string;
}

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>([]);
  const [usuariosDescubrir, setUsuariosDescubrir] = useState<UsuarioDescubrir[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]); // solicitudes entrantes
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"amigos" | "descubrir" | "chats" | "solicitudes">("amigos");
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [fetchUsersError, setFetchUsersError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        cargarDatos();
      }
    }, [user?.id])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos().finally(() => setRefreshing(false));
  }, [user?.id]);

  const cargarDatos = async () => {
    if (!user?.id) {
      console.error("❌ No hay user.id disponible");
      return;
    }

    console.log("👤 Usuario actual ID:", user.id);

    try {
      if (!refreshing) setLoading(true);

      // ========== AMIGOS ==========
      const { data: amistadData, error: errorAmistad } = await supabase
        .from("amistades")
        .select("usuario_1_id, usuario_2_id")
        .or(`usuario_1_id.eq.${user.id},usuario_2_id.eq.${user.id}`)
        .eq("estado", "aceptada");

      if (errorAmistad) {
        console.error("❌ Error amistades:", errorAmistad);
      }

      if (amistadData && amistadData.length > 0) {
        const amigosIds = amistadData.map((a) =>
          a.usuario_1_id === user.id ? a.usuario_2_id : a.usuario_1_id
        );

        const { data: usuariosData, error: errorUsuarios } = await supabase
          .from("usuarios")
          .select("id, nombre, avatar_url")
          .in("id", amigosIds);

        if (errorUsuarios) console.error("❌ Error usuarios:", errorUsuarios);

        const { data: estadosData } = await supabase
          .from("estados_usuario")
          .select("usuario_id, estado, descripcion, ubicacion")
          .in("usuario_id", amigosIds);

        const estadosMap = Object.fromEntries(
          (estadosData || []).map((e) => [e.usuario_id, e])
        );

        const amigosEnriquecidos = (usuariosData || []).map((u) => ({
          ...u,
          estado: estadosMap[u.id]?.estado || "disponible",
          descripcion: estadosMap[u.id]?.descripcion,
          ubicacion: estadosMap[u.id]?.ubicacion,
        }));

        setAmigos(amigosEnriquecidos);
      }

      // ========== RECOMENDACIONES ==========
      const { data: recsData, error: errorRecs } = await supabase
        .from("recomendaciones_aura")
        .select(
          `
          id,
          usuario_recomendado_id,
          tipo,
          compatibilidad_porcentaje,
          razon,
          usuarios:usuario_recomendado_id(id, nombre, avatar_url)
        `
        )
        .eq("usuario_id", user.id)
        .eq("visto", false)
        .order("compatibilidad_porcentaje", { ascending: false })
        .limit(5);

      if (errorRecs) console.error("❌ Error recomendaciones:", errorRecs);

      const recsFormateadas = (recsData || []).map((rec: any) => ({
        id: rec.id,
        usuario_recomendado_id: rec.usuario_recomendado_id,
        tipo: rec.tipo,
        compatibilidad_porcentaje: rec.compatibilidad_porcentaje,
        razon: rec.razon,
        usuarios: Array.isArray(rec.usuarios) ? rec.usuarios[0] : rec.usuarios,
      }));

      setRecomendaciones(recsFormateadas);

      // ========== USUARIOS PARA DESCUBRIR ==========
      console.log("🔄 Cargando usuarios para descubrir...");

      const { data: todasAmistades, error: errorTodasAmistad } = await supabase
        .from("amistades")
        .select("usuario_1_id, usuario_2_id");

      if (errorTodasAmistad) {
        console.error("❌ Error al obtener amistades:", errorTodasAmistad);
      }

      console.log("📌 Todas las amistades:", todasAmistades?.length || 0);

      const usuariosConexion = new Set<string>();
      usuariosConexion.add(user.id);

      if (todasAmistades && todasAmistades.length > 0) {
        todasAmistades.forEach((a) => {
          if (a.usuario_1_id === user.id) {
            usuariosConexion.add(a.usuario_2_id);
          } else if (a.usuario_2_id === user.id) {
            usuariosConexion.add(a.usuario_1_id);
          }
        });
      }

      console.log("🔒 Usuarios a EXCLUIR:", Array.from(usuariosConexion));

      const { data: todosUsuarios, error: errorTodos } = await supabase
        .from("usuarios")
        .select("id, nombre, avatar_url, bio");

      if (errorTodos) {
        console.error("❌ Error al obtener usuarios:", errorTodos);
      }

      console.log("📊 Total de usuarios en DB:", todosUsuarios?.length || 0);
      console.log("📋 Todos los usuarios:", todosUsuarios);

      const usuariosFiltrados = (todosUsuarios || []).filter((u) => {
        const debeIncluir = !usuariosConexion.has(u.id);
        console.log(`   - ${u.nombre} (${u.id}): ${debeIncluir ? "✅ INCLUIR" : "❌ EXCLUIR"}`);
        return debeIncluir;
      });

      console.log("✅ Usuarios para descubrir FINAL:", usuariosFiltrados.length);
      console.log("📋 Usuarios filtrados:", usuariosFiltrados);

      setUsuariosDescubrir(usuariosFiltrados);

      // ========== MENSAJES NO LEÍDOS ==========
      const { count, error: errorCount } = await supabase
        .from("mensajes_directos")
        .select("*", { count: "exact", head: true })
        .eq("destinatario_id", user.id)
        .eq("leido", false);

      if (errorCount) console.error("❌ Error contando mensajes:", errorCount);

      setMensajesNoLeidos(count || 0);

      // ====== OBTENER SOLICITUDES ENTRANTES ======
      const { data: pending, error: pendingErr } = await supabase
        .from("amistades")
        .select("id, usuario_1_id, usuario_2_id, fecha_solicitud, usuario_1:usuario_1_id(id,nombre,avatar_url,bio)")
        .eq("usuario_2_id", user.id)
        .eq("estado", "pendiente");

      if (pendingErr) console.error("❌ Error pending:", pendingErr);

      const solicitudesFormateadas = (pending || []).map((p: any) => ({
        id: p.id,
        usuario_solicitante_id: p.usuario_1_id,
        fecha_solicitud: p.fecha_solicitud,
        usuario_solicitante: Array.isArray(p.usuario_1) ? p.usuario_1[0] : p.usuario_1,
      }));
      setSolicitudes(solicitudesFormateadas);
    } catch (error) {
      console.error("❌ Error cargando datos sociales:", error);
      Alert.alert("Error", "No se pudieron cargar los datos sociales");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const aceptarSolicitud = async (solicitudId: string) => {
    try {
      const { error } = await supabase
        .from("amistades")
        .update({ estado: "aceptada", fecha_aceptacion: new Date().toISOString() })
        .eq("id", solicitudId);

      if (error) throw error;
      await cargarDatos();
    } catch (err: any) {
      console.error("❌ Error aceptando solicitud:", err);
      Alert.alert("Error", err?.message || "No se pudo aceptar la solicitud");
    }
  };

  const declinarSolicitud = async (solicitudId: string) => {
    try {
      const { error } = await supabase.from("amistades").delete().eq("id", solicitudId);
      if (error) throw error;
      await cargarDatos();
    } catch (err: any) {
      console.error("❌ Error declinando solicitud:", err);
      Alert.alert("Error", err?.message || "No se pudo declinar la solicitud");
    }
  };

  // cargar usuarios para el modal justo antes de abrirlo
  const fetchUsuariosDescubrir = async () => {
    if (!user?.id) return;
    setFetchingUsers(true);
    setFetchUsersError(null);
    try {
      const { data: todasAmistades, error: errorTodasAmistad } = await supabase
        .from("amistades")
        .select("usuario_1_id, usuario_2_id");

      if (errorTodasAmistad) {
        console.error("❌ Error al obtener amistades:", errorTodasAmistad);
      }

      const usuariosConexion = new Set<string>();
      usuariosConexion.add(user.id);
      if (todasAmistades && todasAmistades.length > 0) {
        todasAmistades.forEach((a: any) => {
          if (a.usuario_1_id === user.id) usuariosConexion.add(a.usuario_2_id);
          else if (a.usuario_2_id === user.id) usuariosConexion.add(a.usuario_1_id);
        });
      }

      const { data: todosUsuarios, error: errorTodos } = await supabase
        .from("usuarios")
        .select("id, nombre, avatar_url, bio");

      if (errorTodos) {
        console.error("❌ Error al obtener usuarios:", errorTodos);
        setFetchUsersError("Error cargando usuarios");
        setUsuariosDescubrir([]);
        return;
      }

      const usuariosFiltrados = (todosUsuarios || []).filter((u: any) => !usuariosConexion.has(u.id));
      setUsuariosDescubrir(usuariosFiltrados);
    } catch (e) {
      console.error("❌ fetchUsuariosDescubrir error:", e);
      setFetchUsersError("Error inesperado");
      setUsuariosDescubrir([]);
    } finally {
      setFetchingUsers(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#d7b45f" />
        <Text style={styles.loadingText}>Cargando Neura Social...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d7b45f" />
      }
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Neura Social 👥</Text>
        <Text style={styles.headerSubtitle}>Conecta con estudiantes</Text>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "amigos" && styles.tabActive]}
            onPress={() => setActiveTab("amigos")}
          >
            <Text
              style={[styles.tabText, activeTab === "amigos" && styles.tabTextActive]}
            >
              Amigos ({amigos.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "descubrir" && styles.tabActive]}
            onPress={() => setActiveTab("descubrir")}
          >
            <Text
              style={[styles.tabText, activeTab === "descubrir" && styles.tabTextActive]}
            >
              Descubrir ({usuariosDescubrir.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "chats" && styles.tabActive]}
            onPress={() => setActiveTab("chats")}
          >
            <View style={{ position: "relative" }}>
              <Text
                style={[styles.tabText, activeTab === "chats" && styles.tabTextActive]}
              >
                Chats
              </Text>
              {mensajesNoLeidos > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{mensajesNoLeidos}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENIDO POR TAB */}
      {activeTab === "amigos" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amigos en línea</Text>
          {amigos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#9bc7b4" />
              <Text style={styles.emptyText}>No tienes amigos aún</Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setActiveTab("descubrir")}
              >
                <Text style={styles.secondaryBtnText}>Descubrir personas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            amigos.map((amigo) => (
              <TarjetaAmigo
                key={amigo.id}
                amigo={amigo}
                onPress={() =>
                  router.push(`/home/chat/${amigo.id}`)
                }
              />
            ))
          )}
        </View>
      )}

      {activeTab === "descubrir" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Personas para descubrir</Text>
          {usuariosDescubrir.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color="#9bc7b4" />
              <Text style={styles.emptyText}>No hay personas disponibles</Text>
            </View>
          ) : (
            usuariosDescubrir.map((usuario) => (
              <TarjetaUsuarioDescubrir
                key={usuario.id}
                usuario={usuario}
                onEnviarSolicitud={() => handleEnviarSolicitud(usuario.id, cargarDatos)}
              />
            ))
          )}
        </View>
      )}

      {activeTab === "chats" && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/home/social/mensajes")}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#0d1f23" />
            <Text style={styles.primaryBtnText}>Ver todos los mensajes</Text>
          </TouchableOpacity>

          {/* Nuevo botón para redactar chat - sólo amigos */}
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 12, backgroundColor: "#9bc7b4" }]}
            onPress={() => setShowNewChatPicker(true)}
          >
            <Ionicons name="create-outline" size={18} color="#0d1f23" />
            <Text style={[styles.primaryBtnText, { color: "#0d1f23" }]}>Redactar chat</Text>
          </TouchableOpacity>

          {/* Modal limpio y sin romper JSX */}
          <Modal
            visible={showNewChatPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowNewChatPicker(false)}
          >
            <View style={styles.pickerModalWrapper}>
              <View style={styles.pickerCard}>
                <Text style={styles.sectionTitle}>Selecciona amigo</Text>

                {amigos.length === 0 ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: "#9bc7b4", marginBottom: 12, textAlign: "center" }}>
                      No tienes amigos para iniciar un chat.
                    </Text>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { paddingHorizontal: 20 }]}
                      onPress={() => {
                        setShowNewChatPicker(false);
                        setActiveTab("descubrir");
                      }}
                    >
                      <Text style={styles.secondaryBtnText}>Ir a descubrir</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 360 }}>
                    {amigos.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={styles.pickerItem}
                        onPress={() => {
                          setShowNewChatPicker(false);
                          router.push(`/home/chat/${a.id}`);
                        }}
                      >
                        {a.avatar_url ? (
                          <Image source={{ uri: a.avatar_url }} style={styles.pickerAvatar} />
                        ) : (
                          <View style={styles.pickerAvatar}>
                            <Text style={styles.avatarInitial}>{(a.nombre || "U")[0]}</Text>
                          </View>
                        )}
                        <Text style={styles.pickerText}>{a.nombre}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity style={[styles.secondaryBtn, { marginTop: 12 }]} onPress={() => setShowNewChatPicker(false)}>
                  <Text style={styles.secondaryBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}

      {activeTab === "solicitudes" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solicitudes de amistad</Text>
          {solicitudes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#9bc7b4" />
              <Text style={styles.emptyText}>No tienes solicitudes pendientes</Text>
            </View>
          ) : (
            solicitudes.map((solicitud) => (
              <TarjetaSolicitud
                key={solicitud.id}
                solicitud={solicitud}
                onAceptar={() => aceptarSolicitud(solicitud.id)}
                onDeclinar={() => declinarSolicitud(solicitud.id)}
              />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

/* COMPONENTE TARJETA DE AMIGO */
function TarjetaAmigo({ amigo, onPress }: { amigo: Amigo; onPress: () => void }) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "disponible":
        return "#5bed7c";
      case "en_clase":
        return "#ffc107";
      case "estudiando":
        return "#2196f3";
      case "ocupado":
        return "#f44336";
      default:
        return "#9bc7b4";
    }
  };

  return (
    <TouchableOpacity style={styles.amigoCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.amigoLeft}>
        {amigo.avatar_url ? (
          <Image source={{ uri: amigo.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{amigo.nombre[0]}</Text>
          </View>
        )}
        <View
          style={[
            styles.estadoIndicador,
            { backgroundColor: getEstadoColor(amigo.estado) },
          ]}
        />
      </View>

      <View style={styles.amigoContent}>
        <Text style={styles.amigoNombre}>{amigo.nombre}</Text>
        <Text style={styles.amigoEstado}>
          {amigo.descripcion || amigo.estado}
        </Text>
        {amigo.ubicacion && (
          <Text style={styles.amigoUbicacion}>📍 {amigo.ubicacion}</Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#d7b45f" />
    </TouchableOpacity>
  );
}

/* COMPONENTE TARJETA DE USUARIO PARA DESCUBRIR */
function TarjetaUsuarioDescubrir({
  usuario,
  onEnviarSolicitud,
}: {
  usuario: UsuarioDescubrir;
  onEnviarSolicitud: () => void;
}) {
  return (
    <View style={styles.descubrirCard}>
      <View style={styles.descubrirHeader}>
        {usuario.avatar_url ? (
          <Image source={{ uri: usuario.avatar_url }} style={styles.descubrirAvatar} />
        ) : (
          <View style={styles.descubrirAvatarPlaceholder}>
            <Text style={styles.avatarInitial}>{usuario.nombre[0]}</Text>
          </View>
        )}
      </View>

      <Text style={styles.descubrirNombre}>{usuario.nombre}</Text>
      {usuario.bio && <Text style={styles.descubrirBio}>{usuario.bio}</Text>}

      <TouchableOpacity
        style={styles.descubrirBtn}
        onPress={onEnviarSolicitud}
        activeOpacity={0.7}
      >
        <Ionicons name="person-add-outline" size={18} color="#0d1f23" />
        <Text style={styles.descubrirBtnText}>Enviar solicitud</Text>
      </TouchableOpacity>
    </View>
  );
}

/* COMPONENTE TARJETA DE SOLICITUD */
function TarjetaSolicitud({
  solicitud,
  onAceptar,
  onDeclinar,
}: {
  solicitud: any;
  onAceptar: () => void;
  onDeclinar: () => void;
}) {
  return (
    <View style={styles.solicitudCard}>
      <View style={styles.solicitudLeft}>
        {solicitud.usuario_solicitante.avatar_url ? (
          <Image source={{ uri: solicitud.usuario_solicitante.avatar_url }} style={styles.solicitudAvatar} />
        ) : (
          <View style={styles.solicitudAvatarPlaceholder}>
            <Text style={styles.avatarInitial}>{solicitud.usuario_solicitante.nombre[0]}</Text>
          </View>
        )}

        <View style={styles.solicitudContent}>
          <Text style={styles.solicitudNombre}>{solicitud.usuario_solicitante.nombre}</Text>
          <Text style={styles.solicitudFecha}>
            {new Date(solicitud.fecha_solicitud).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.solicitudActions}>
        <TouchableOpacity
          style={[styles.solicitudBtn, styles.aceptarBtn]}
          onPress={onAceptar}
        >
          <Text style={styles.solicitudBtnText}>Aceptar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.solicitudBtn, styles.declinarBtn]}
          onPress={onDeclinar}
        >
          <Text style={styles.solicitudBtnText}>Declinar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// FUNCIÓN PARA ENVIAR SOLICITUD DE AMISTAD
async function handleEnviarSolicitud(usuarioReceptorId: string, onSuccess: () => void) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      Alert.alert("Error", "No estás autenticado");
      return;
    }

    console.log(`📤 Enviando solicitud de ${user.id} a ${usuarioReceptorId}`);

    const { error } = await supabase.from("amistades").insert({
      usuario_1_id: user.id,
      usuario_2_id: usuarioReceptorId,
      estado: "pendiente",
    });

    if (error) {
      console.error("❌ Error al enviar solicitud:", error);
      Alert.alert("Error", `No se pudo enviar la solicitud: ${error.message}`);
    } else {
      Alert.alert("✅ Éxito", "Solicitud enviada correctamente");
      onSuccess(); // Recargar datos
    }
  } catch (error) {
    console.error("❌ Error:", error);
    Alert.alert("Error", "Algo salió mal");
  }
}

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
    color: "#9bc7b4",
    marginTop: 12,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#10282b",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(215, 180, 95, 0.1)",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#d7b45f",
  },
  tabText: {
    color: "#9bc7b4",
    fontSize: 12,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#0d1f23",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff6b6b",
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  section: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: "#d7b45f",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#9bc7b4",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  amigoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15363a",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  amigoLeft: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d7b45f",
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d7b45f",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#0d1f23",
    fontSize: 18,
    fontWeight: "700",
  },
  estadoIndicador: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0d1f23",
  },
  amigoContent: {
    flex: 1,
  },
  amigoNombre: {
    color: "#f3f7f5",
    fontSize: 15,
    fontWeight: "600",
  },
  amigoEstado: {
    color: "#9bc7b4",
    fontSize: 12,
    marginTop: 2,
  },
  amigoUbicacion: {
    color: "#d7b45f",
    fontSize: 11,
    marginTop: 4,
  },
  // 🆕 ESTILOS PARA DESCUBRIR
  descubrirCard: {
    backgroundColor: "#15363a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.2)",
  },
  descubrirHeader: {
    marginBottom: 12,
  },
  descubrirAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#d7b45f",
  },
  descubrirAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#d7b45f",
    alignItems: "center",
    justifyContent: "center",
  },
  descubrirNombre: {
    color: "#f3f7f5",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  descubrirBio: {
    color: "#9bc7b45",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  descubrirBtn: {
    flexDirection: "row",
    backgroundColor: "#d7b45f",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
  },
  descubrirBtnText: {
    color: "#0d1f23",
    fontWeight: "600",
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#d7b45f",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: "#0d1f23",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#d7b45f",
  },
  secondaryBtnText: {
    color: "#d7b45f",
    fontWeight: "600",
    fontSize: 14,
  },
  // NUEVOS ESTILOS PARA SOLICITUDES
  solicitudCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15363a",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  solicitudLeft: {
    position: "relative",
  },
  solicitudAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d7b45f",
  },
  solicitudAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d7b45f",
    alignItems: "center",
    justifyContent: "center",
  },
  solicitudContent: {
    flex: 1,
  },
  solicitudNombre: {
    color: "#f3f7f5",
    fontSize: 15,
    fontWeight: "600",
  },
  solicitudFecha: {
    color: "#9bc7b4",
    fontSize: 12,
    marginTop: 2,
  },
  solicitudActions: {
    flexDirection: "row",
    gap: 8,
  },
  solicitudBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aceptarBtn: {
    backgroundColor: "#5bed7c",
  },
  declinarBtn: {
    backgroundColor: "#f44336",
  },
  solicitudBtnText: {
    color: "#0d1f23",
    fontWeight: "600",
    fontSize: 14,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent", // ya no oscurece excesivamente
  },
  pickerContainer: {
    width: "90%",
    maxHeight: "70%",
    backgroundColor: "#0d1f23",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(215,180,95,0.15)",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  pickerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#d7b45f", alignItems: "center", justifyContent: "center" },
  pickerText: { color: "#f3f7f5", marginLeft: 8, fontWeight: "600" },

  /* Nuevos estilos del modal (wrapper y card) */
  pickerModalWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerCard: {
    width: "92%",
    maxHeight: "80%",
    backgroundColor: "#0f2f2f",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(215,180,95,0.08)",
  },
});