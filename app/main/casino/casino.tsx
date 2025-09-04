import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import { Poppins_400Regular, Poppins_600SemiBold, useFonts } from "@expo-google-fonts/poppins";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CasinoScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    PlayfairDisplay_700Bold,
  });
  const router = useRouter();

  if (!fontsLoaded) return null;

  const juegos = [
    { id: 1, name: "🎰 Tragamonedas", route: "/main/casino/tragamonedas" },
    { id: 2, name: "🃏 Blackjack", route: "/main/casino/blackjack" },
    { id: 3, name: "🎲 Ruleta", route: "/main/casino/ruleta" },
    { id: 4, name: "🎯 Bingo", route: "/main/casino/bingo" },
    { id: 5, name: "🀄 Poker", route: "/main/casino/poker" },
    { id: 6, name: "🎱 Lotería", route: "/main/casino/loteria" },
  ];

  return (
    <LinearGradient colors={["#0f2027", "#092e20", "#041c13"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>🎮 Casino Virtual</Text>
          <Text style={styles.subtitle}>Elige tu juego favorito y prueba tu suerte 🍀</Text>

          {juegos.map((juego) => (
            <TouchableOpacity
              key={juego.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push(juego.route)}
            >
              <Text style={styles.cardText}>{juego.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: { paddingHorizontal: 25, paddingVertical: 40, alignItems: "center" },
  title: {
    fontSize: 30,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#FFD700",
    marginBottom: 5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#ccc",
    marginBottom: 30,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    alignItems: "center",
    width: "100%",
    shadowColor: "#FFD700",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cardText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
  },
});
