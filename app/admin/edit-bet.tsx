import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditBetScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [bet, setBet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchBet = async () => {
    const { data, error } = await supabase.from("bets").select("*").eq("id", id).single();
    if (!error && data) {
      setBet(data);
    }
  };

  const handleUpdateBet = async () => {
  if (!bet) return;
  setLoading(true);

  console.log("Editando bet con ID:", id);

  const { data, error } = await supabase
    .from("bets")
    .update({
      description: bet.description,
      cost: bet.cost,
      team1: bet.team1,
      team2: bet.team2,
      winner: bet.winner,
      status: bet.status,
      close_at: bet.close_at,
    })
    .eq("id", id)
    .select(); // importante: devuelve la fila actualizada

  setLoading(false);

  if (error) {
    console.error("Error update:", error);
    Alert.alert("Error", "No se pudo actualizar la apuesta.");
  } else if (data.length === 0) {
    Alert.alert("Aviso", "No se encontró ninguna apuesta con ese ID.");
  } else {
    console.log("Apuesta actualizada:", data);
    Alert.alert("Éxito", "Apuesta actualizada.");
    router.push("/main/(tabs)/eventos");
  }
};


 const handleDeleteBet = async () => {
  console.log("Eliminando bet con ID:", id);

  Alert.alert("Eliminar Apuesta", "¿Seguro que deseas eliminar esta apuesta?", [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Eliminar",
      style: "destructive",
      onPress: async () => {
        const { error, count } = await supabase
          .from("bets")
          .delete({ count: "exact" }) // devuelve cuántas filas eliminó
          .eq("id", id);

        if (error) {
          console.error("Error delete:", error);
          Alert.alert("Error", "No se pudo eliminar la apuesta.");
        } else if (count === 0) {
          Alert.alert("Aviso", "No se encontró ninguna apuesta con ese ID.");
        } else {
          Alert.alert("Éxito", "Apuesta eliminada.");
          router.push("/main/(tabs)/eventos");
        }
      },
    },
  ]);
};


  useEffect(() => {
    fetchBet();
  }, []);

  if (!bet) return <ActivityIndicator style={{ flex: 1 }} />;

  const renderInput = (label: string, key: string, numeric = false) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={label}
        placeholderTextColor="#aaa"
        value={bet[key] !== null && bet[key] !== undefined ? String(bet[key]) : ""}
        onChangeText={(text) => setBet({ ...bet, [key]: numeric ? Number(text) : text })}
        keyboardType={numeric ? "numeric" : "default"}
      />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.container}>
        <Text style={styles.title}>✏️ Editar Apuesta</Text>

        {renderInput("Descripción", "description")}
        {renderInput("Costo", "cost", true)}
        {renderInput("Equipo 1", "team1")}
        {renderInput("Equipo 2", "team2")}
        {renderInput("1X2", "one_x_two")}
        {renderInput("Score Team1", "score_team1", true)}
        {renderInput("Score Team2", "score_team2", true)}
        {renderInput("HT Team1", "half_time_team1", true)}
        {renderInput("HT Team2", "half_time_team2", true)}
        {renderInput("Primer Gol", "first_goal")}
        {renderInput("Corners Team1", "corners_team1", true)}
        {renderInput("Corners Team2", "corners_team2", true)}
        {renderInput("Shots Team1", "shots_team1", true)}
        {renderInput("Shots Team2", "shots_team2", true)}
        {renderInput("Fouls Team1", "fouls_team1", true)}
        {renderInput("Fouls Team2", "fouls_team2", true)}
        {renderInput("Amarillas Team1", "yellow_team1", true)}
        {renderInput("Amarillas Team2", "yellow_team2", true)}
        {renderInput("Rojas Team1", "red_team1", true)}
        {renderInput("Rojas Team2", "red_team2", true)}
        {renderInput("Draw", "draw")}
        {renderInput("Ganador", "winner")}
        {renderInput("Estado", "status")}

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.buttonText}>
            📅 Fecha cierre: {bet.close_at ? new Date(bet.close_at).toLocaleString() : "No definida"}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={bet.close_at ? new Date(bet.close_at) : new Date()}
            mode="datetime"
            display="default"
            onChange={(event, date) => {
              setShowPicker(false);
              if (date) setBet({ ...bet, close_at: date.toISOString() });
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleUpdateBet}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>💾 Guardar</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteBet}
        >
          <Text style={styles.buttonText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 25, backgroundColor: "#0f2027" },
  container: { flex: 1 },
  title: { fontSize: 26, color: "#FFD700", marginBottom: 20, textAlign: "center" },
  label: { color: "#FFD700", marginBottom: 5 },
  input: {
    backgroundColor: "#1c2a2b",
    padding: 14,
    borderRadius: 12,
    color: "#fff",
  },
  dateButton: {
    backgroundColor: "#1c2a2b",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 10,
    alignItems: "center",
  },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  saveButton: { backgroundColor: "#28a745" },
  deleteButton: { backgroundColor: "#dc3545" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
