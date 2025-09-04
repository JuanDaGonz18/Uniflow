import { useAuth } from "@/contexts/AuthContext";
import { CinzelDecorative_400Regular } from "@expo-google-fonts/cinzel-decorative";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { saldo, ultimoMovimiento } = useAuth();

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    Poppins_400Regular,
    Poppins_600SemiBold,
    CinzelDecorative_400Regular,
  });

  if (!fontsLoaded) return null;

  const partidos = [
    { id: 1, team1: "Barcelona", team2: "Real Madrid" },
    { id: 2, team1: "PSG", team2: "Manchester City" },
    { id: 3, team1: "Boca Juniors", team2: "River Plate" },
  ];

  const juegosCasino = [
    { id: 1, name: "🎰 Tragamonedas", path: "/main/casino/tragamonedas" },
    { id: 2, name: "♠️ Póker", path: "/main/casino/poker" },
    { id: 3, name: "🎲 Ruleta", path: "/main/casino/ruleta" },
  ];

  return (
    <LinearGradient
      colors={["#0f2027", "#092e20", "#041c13"]}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>🏆 Bienvenido a BetApp</Text>
          <Text style={styles.subtitle}>
            Vive la emoción de tus eventos favoritos
          </Text>

          {/* Próximos Partidos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Próximos Partidos</Text>
            {partidos.map((partido) => (
              <TouchableOpacity
                key={partido.id}
                style={styles.matchButton}
                onPress={() =>
                  router.push(
                    `/partidos/${partido.id}?team1=${encodeURIComponent(
                      partido.team1
                    )}&team2=${encodeURIComponent(partido.team2)}`
                  )
                }
              >
                <Text style={styles.cardText}>
                  {partido.team1} vs {partido.team2}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/main/eventos")}
            >
              <Text style={styles.buttonText}>Ver todos los eventos</Text>
            </TouchableOpacity>
          </View>

          {/* Sección Casino */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎰 Casino Destacado</Text>
            {juegosCasino.map((juego) => (
              <TouchableOpacity
                key={juego.id}
                style={styles.matchButton}
                onPress={() => router.push(juego.path)}
              >
                <Text style={styles.cardText}>{juego.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/main/casino")}
            >
              <Text style={styles.buttonText}>Explorar Casino</Text>
            </TouchableOpacity>
          </View>

          {/* Sección Cuenta */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💳 Mi Saldo</Text>
            <Text style={styles.cardText}>Saldo: ${saldo}</Text>
            <Text style={styles.cardText}>Último movimiento: {ultimoMovimiento}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/main/saldo")}
            >
              <Text style={styles.buttonText}>Ir al saldo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            ✨ Apuesta con estilo, gana con pasión ✨
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 60 },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 36,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#FFD700",
    marginBottom: 8,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: "CinzelDecorative_400Regular",
    color: "#c8d6c4",
    marginBottom: 30,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
    marginBottom: 25,
    shadowColor: "#FFD700",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFD700",
    marginBottom: 18,
    textAlign: "center",
  },
  matchButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardText: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#fff",
  },
  button: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: {
    color: "#0f2027",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },
  footer: {
    marginTop: 30,
    fontSize: 14,
    color: "#c8d6c4",
    fontFamily: "CinzelDecorative_400Regular",
    textAlign: "center",
  },
});
