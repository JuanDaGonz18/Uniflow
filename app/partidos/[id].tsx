import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Params = {
  id: string; // id de la apuesta
  team1: string;
  team2: string;
  desc?: string;
  cost?: string;
};

type BetOption = {
  type: string;
  label: string;
  cuota: string;
  exclusiveGroup?: string;
  input?: boolean;
};

export default function MatchDetail() {
  const { id, team1, team2, desc, cost } = useLocalSearchParams<Params>();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [selectedBets, setSelectedBets] = useState<BetOption[]>([]);
  const [customInputs, setCustomInputs] = useState<{ [key: string]: string }>({});
  const [amount, setAmount] = useState(""); // monto a apostar
  const [closeAt, setCloseAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<string>("");

  // Obtener datos del partido y rol del usuario
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role || null);

      const { data: bet } = await supabase
        .from("bets")
        .select("close_at, status")
        .eq("id", id)
        .single();

      if (bet) {
        setCloseAt(bet.close_at ? new Date(bet.close_at) : null);
        setStatus(bet.status);
      }
    };
    fetchData();
  }, []);

  // Función para generar cuotas aleatorias en un rango
const generarCuota = (min: number = 1.40, max: number = 3.50) => {
  const num = Math.random() * (max - min) + min;
  return num.toFixed(2); // 2 decimales
};

// Opciones predeterminadas con cuotas dinámicas
const opciones: BetOption[] = [
  { type: "Resultado", label: `Gana ${team1}`, cuota: generarCuota(), exclusiveGroup: "resultado" },
  { type: "Resultado", label: "Empate", cuota: generarCuota(2.50, 4.00), exclusiveGroup: "resultado" },
  { type: "Resultado", label: `Gana ${team2}`, cuota: generarCuota(), exclusiveGroup: "resultado" },

  { type: "Primer Gol", label: `Primer gol ${team1}`, cuota: generarCuota(1.40, 2.20), exclusiveGroup: "primerGol" },
  { type: "Primer Gol", label: `Primer gol ${team2}`, cuota: generarCuota(1.40, 2.20), exclusiveGroup: "primerGol" },

  { type: "Corners", label: `Más de X corners`, cuota: generarCuota(1.80, 2.50), input: true },
  { type: "Corners", label: `Menos de X corners`, cuota: generarCuota(1.80, 2.50), input: true },

  { type: "Faltas", label: `Más de X faltas`, cuota: generarCuota(1.70, 2.50), input: true },
  { type: "Faltas", label: `Menos de X faltas`, cuota: generarCuota(1.70, 2.50), input: true },

  { type: "Tarjetas", label: `Más de X amarillas`, cuota: generarCuota(1.60, 2.20), input: true },
  { type: "Tarjetas", label: `Más de X rojas`, cuota: generarCuota(2.50, 5.00), input: true },
];


  const toggleBet = (opt: BetOption) => {
    if (role === "ADMIN") {
      Alert.alert("⚠️ Prohibido", "Los administradores no pueden apostar.");
      return;
    }
    setSelectedBets((prev) => {
      if (prev.some((b) => b.label === opt.label)) {
        return prev.filter((b) => b.label !== opt.label);
      }
      if (opt.exclusiveGroup) {
        return [...prev.filter((b) => b.exclusiveGroup !== opt.exclusiveGroup), opt];
      }
      return [...prev, opt];
    });
  };

  const confirmarApuesta = async () => {
    if (status !== "open" || (closeAt && new Date() > closeAt)) {
      Alert.alert("⏰ Cerrado", "Ya no puedes apostar en este partido.");
      return;
    }
    if (selectedBets.length === 0) {
      Alert.alert("⚠️ Error", "Debes seleccionar al menos una opción.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("⚠️ Error", "Debes ingresar un monto válido.");
      return;
    }
    if (Number(amount) < Number(cost || 0)) {
      Alert.alert("⚠️ Error", `La apuesta mínima es de ${cost} pts`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Resumen
    const resumen = selectedBets
      .map((b) =>
        b.input
          ? `${b.label.replace("X", customInputs[b.label] || "X")} (cuota ${b.cuota})`
          : `${b.label} (cuota ${b.cuota})`
      )
      .join(" | ");

    // Calcular cuota total y ganancia
    const cuotaTotal = selectedBets.reduce((acc, b) => acc * Number(b.cuota), 1);
    const gananciaPotencial = Number(amount) * cuotaTotal;

    // Guardar apuesta
    const { error } = await supabase.from("user_bets").insert([
      {
        user_id: user.id,
        bet_id: id,
        amount: Number(amount),
        team1,
        team2,
        description: resumen,
        choice: resumen,
        won: false,
        paid: false,
      },
    ]);

    if (error) {
      console.error(error);
      Alert.alert("❌ Error", "No se pudo guardar la apuesta.");
    } else {
      Alert.alert(
        "✅ Apuesta confirmada",
        `Monto: ${amount} pts\nGanancia potencial: ${gananciaPotencial.toFixed(2)} pts`
      );
      router.push("/main/(tabs)/eventos");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#041c13" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>⬅️ Volver</Text>
      </TouchableOpacity>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{team1} vs {team2}</Text>
        {desc && <Text style={styles.desc}>{desc}</Text>}
        {cost && <Text style={styles.cost}>Apuesta mínima: {cost} pts</Text>}
        {closeAt && (
          <Text style={styles.desc}>Cierra: {closeAt.toLocaleString()} ({status})</Text>
        )}

        <Text style={styles.subtitle}>📊 Opciones de Apuesta:</Text>
        {opciones.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.betButton,
              selectedBets.some((b) => b.label === opt.label) && styles.betButtonSelected,
            ]}
            onPress={() => toggleBet(opt)}
          >
            <Text style={styles.betText}>
              {opt.label.replace("X", customInputs[opt.label] || "X")} ({opt.cuota})
            </Text>
            {opt.input && selectedBets.some((b) => b.label === opt.label) && (
              <TextInput
                style={styles.input}
                placeholder="Número"
                keyboardType="numeric"
                placeholderTextColor="#ccc"
                value={customInputs[opt.label] || ""}
                onChangeText={(txt) =>
                  setCustomInputs((prev) => ({ ...prev, [opt.label]: txt }))
                }
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resumen fijo */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>📝 Tu combinada:</Text>
        {selectedBets.length === 0 ? (
          <Text style={styles.summaryEmpty}>No has seleccionado apuestas.</Text>
        ) : (
          selectedBets.map((b, i) => (
            <Text key={i} style={styles.summaryText}>
              {b.input
                ? `${b.label.replace("X", customInputs[b.label] || "X")} (cuota ${b.cuota})`
                : `${b.label} (cuota ${b.cuota})`}
            </Text>
          ))
        )}

        <TextInput
          style={styles.amountInput}
          placeholder="Monto de la apuesta"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          placeholderTextColor="#ccc"
        />

        {amount && selectedBets.length > 0 && (
          <Text style={styles.potential}>
            Ganancia Potencial: {(Number(amount) * selectedBets.reduce((acc, b) => acc * Number(b.cuota), 1)).toFixed(2)} pts
          </Text>
        )}

        <TouchableOpacity style={styles.confirmButton} onPress={confirmarApuesta}>
          <Text style={styles.confirmText}>✅ Confirmar Apuesta</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 26, color: "#FFD700", fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  desc: { fontSize: 16, color: "#c8d6c4", marginBottom: 5, textAlign: "center" },
  cost: { fontSize: 16, color: "#c8d6c4", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 18, color: "#FFD700", marginBottom: 15, fontWeight: "600" },
  betButton: { backgroundColor: "#14532d", padding: 14, borderRadius: 12, marginBottom: 12 },
  betButtonSelected: { backgroundColor: "#1d6b3c" },
  betText: { color: "#FFD700", fontSize: 16, fontWeight: "bold" },
  input: { marginTop: 8, backgroundColor: "#fff", padding: 6, borderRadius: 6, width: "50%", textAlign: "center" },
  summaryContainer: { backgroundColor: "#0d2817", padding: 16, borderTopWidth: 2, borderTopColor: "#FFD700" },
  summaryTitle: { color: "#FFD700", fontWeight: "bold", fontSize: 18, marginBottom: 8 },
  summaryEmpty: { color: "#aaa", fontSize: 14, fontStyle: "italic" },
  summaryText: { color: "#fff", marginBottom: 4, fontSize: 15 },
  amountInput: { backgroundColor: "#1c2a2b", padding: 12, borderRadius: 8, marginVertical: 8, color: "#fff" },
  potential: { color: "#FFD700", marginTop: 8, fontWeight: "bold" },
  confirmButton: { marginTop: 10, backgroundColor: "#FFD700", padding: 12, borderRadius: 10, alignItems: "center" },
  confirmText: { color: "#041c13", fontWeight: "bold", fontSize: 16 },
  backButton: { padding: 10, backgroundColor: "#FFD700" },
  backText: { color: "#041c13", fontWeight: "bold" },
});
