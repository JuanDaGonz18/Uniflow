import { supabase } from "@/utils/supabase";
import { CinzelDecorative_400Regular } from "@expo-google-fonts/cinzel-decorative";
import { PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { Poppins_400Regular, Poppins_600SemiBold, useFonts } from "@expo-google-fonts/poppins";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Bet = {
  id: string;
  description: string;
  cost: number;
  team1?: string;
  team2?: string;
  status?: string;
};

export default function EventosScreen() {
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    CinzelDecorative_400Regular,
  });

  useEffect(() => {
    const fetchBets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bets")
        .select("id, description, cost, team1, team2, status")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando bets:", error);
      } else {
        setBets((data || []).filter((b) => b.status === "open")); // solo abiertas
      }
      setLoading(false);
    };

    fetchBets();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(profile?.role || null);
    };

    fetchRole();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <LinearGradient colors={["#0f2027", "#092e20", "#041c13"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>🎉 Próximos Eventos</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FFD700" />
          ) : bets.length === 0 ? (
            <Text style={{ color: "#fff", textAlign: "center", marginTop: 20 }}>
              No hay apuestas disponibles
            </Text>
          ) : (
            bets.map((bet) => (
              <View key={bet.id} style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push(
                      `/partidos/${bet.id}?team1=${encodeURIComponent(bet.team1 || "")}&team2=${encodeURIComponent(
                        bet.team2 || ""
                      )}&desc=${encodeURIComponent(bet.description)}&cost=${bet.cost}`
                    )
                  }
                >
                  {/* Partido */}
                  <Text style={styles.cardText}>
                    {bet.team1 && bet.team2 ? `${bet.team1} vs ${bet.team2}` : "Partido"}
                  </Text>

                  {/* Descripción */}
                  <Text style={styles.cardDesc}>{bet.description}</Text>

                  {/* Costo */}
                  <Text style={styles.cardSub}>Costo mínimo: {bet.cost}</Text>
                </TouchableOpacity>

                {/* Botón de admin */}
                {role === "ADMIN" && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => router.push(`/admin/edit-bet?id=${bet.id}`)}
                  >
                    <Text style={styles.editButtonText}>✏️ Editar</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {role === "ADMIN" && (
        <TouchableOpacity style={styles.adminButton} onPress={() => router.push("admin/create-bet")}>
          <Text style={styles.adminButtonText}>➕ Crear apuesta</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 80 },
  container: { paddingHorizontal: 25, paddingVertical: 40 },
  title: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#FFD700",
    marginBottom: 25,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    position: "relative",
  },
  cardText: {
    color: "#fff",
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    textAlign: "center",
  },
  cardDesc: {
    marginTop: 6,
    color: "#ccc",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  cardSub: {
    marginTop: 6,
    color: "#FFD700",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  editButton: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "center",
  },
  editButtonText: {
    color: "#000",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  adminButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FFD700",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  adminButtonText: {
    color: "#000",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
});
