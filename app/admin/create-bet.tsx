import { supabase } from "@/utils/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateBetScreen() {
  const router = useRouter();

  // Campos base
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [closeAt, setCloseAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Opciones
  const [drawEnabled, setDrawEnabled] = useState(true);
  const [oneXTwo, setOneXTwo] = useState<string | null>(null);
  const [firstGoal, setFirstGoal] = useState<string | null>(null);
  const [status, setStatus] = useState("open");
  const [winner, setWinner] = useState<string | null>(null);

  // Estadísticas
  const [scoreTeam1, setScoreTeam1] = useState("");
  const [scoreTeam2, setScoreTeam2] = useState("");
  const [halfTimeTeam1, setHalfTimeTeam1] = useState("");
  const [halfTimeTeam2, setHalfTimeTeam2] = useState("");
  const [cornersTeam1, setCornersTeam1] = useState("");
  const [cornersTeam2, setCornersTeam2] = useState("");
  const [shotsTeam1, setShotsTeam1] = useState("");
  const [shotsTeam2, setShotsTeam2] = useState("");
  const [foulsTeam1, setFoulsTeam1] = useState("");
  const [foulsTeam2, setFoulsTeam2] = useState("");
  const [yellowTeam1, setYellowTeam1] = useState("");
  const [yellowTeam2, setYellowTeam2] = useState("");
  const [redTeam1, setRedTeam1] = useState("");
  const [redTeam2, setRedTeam2] = useState("");
  const [draw, setDraw] = useState("");

  const handleCreateBet = async () => {
    if (!description || !cost || !team1 || !team2) {
      Alert.alert("Error", "Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("bets").insert([
      {
        description,
        cost: parseFloat(cost),
        team1,
        team2,
        one_x_two: oneXTwo,
        draw_enabled: drawEnabled,
        score_team1: scoreTeam1 ? parseInt(scoreTeam1) : null,
        score_team2: scoreTeam2 ? parseInt(scoreTeam2) : null,
        half_time_team1: halfTimeTeam1 ? parseInt(halfTimeTeam1) : null,
        half_time_team2: halfTimeTeam2 ? parseInt(halfTimeTeam2) : null,
        first_goal: firstGoal,
        corners_team1: cornersTeam1 ? parseInt(cornersTeam1) : null,
        corners_team2: cornersTeam2 ? parseInt(cornersTeam2) : null,
        shots_team1: shotsTeam1 ? parseInt(shotsTeam1) : null,
        shots_team2: shotsTeam2 ? parseInt(shotsTeam2) : null,
        fouls_team1: foulsTeam1 ? parseInt(foulsTeam1) : null,
        fouls_team2: foulsTeam2 ? parseInt(foulsTeam2) : null,
        yellow_team1: yellowTeam1 ? parseInt(yellowTeam1) : null,
        yellow_team2: yellowTeam2 ? parseInt(yellowTeam2) : null,
        red_team1: redTeam1 ? parseInt(redTeam1) : null,
        red_team2: redTeam2 ? parseInt(redTeam2) : null,
        draw: draw || null,
        close_at: closeAt.toISOString(),
        status,
        winner,
        created_by: user?.id || null,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo crear la apuesta.");
    } else {
      Alert.alert("Éxito", "Apuesta creada correctamente.");
      router.push("/main/(tabs)/eventos");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0f2027" }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>➕ Crear Apuesta</Text>

          {/* Datos básicos */}
          <TextInput placeholder="Equipo 1" style={styles.input} value={team1} onChangeText={setTeam1} placeholderTextColor="#aaa"/>
          <TextInput placeholder="Equipo 2" style={styles.input} value={team2} onChangeText={setTeam2} placeholderTextColor="#aaa"/>
          <TextInput placeholder="Descripción" style={styles.input} value={description} onChangeText={setDescription} placeholderTextColor="#aaa"/>
          <TextInput placeholder="Costo mínimo" style={styles.input} keyboardType="numeric" value={cost} onChangeText={setCost} placeholderTextColor="#aaa"/>

          {/* Fecha cierre */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.buttonText}>
              📅 Cierre: {closeAt.toLocaleString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={closeAt}
              mode="date"
              display="calendar"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (event.type === "set" && date) {
                  // Mantener la hora anterior
                  const newDate = new Date(date);
                  newDate.setHours(closeAt.getHours());
                  newDate.setMinutes(closeAt.getMinutes());
                  setCloseAt(newDate);
                }
                setTimeout(() => setShowTimePicker(true), 300); // Abre el time picker después
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={closeAt}
              mode="time"
              display="spinner"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (event.type === "set" && date) {
                  // Mantener la fecha anterior
                  const newDate = new Date(closeAt);
                  newDate.setHours(date.getHours());
                  newDate.setMinutes(date.getMinutes());
                  setCloseAt(newDate);
                }
              }}
            />
          )}

          {/* Opciones 1X2 */}
          <Text style={styles.sectionTitle}>Resultado Principal</Text>
          <View style={styles.betOptions}>
            <TouchableOpacity style={[styles.option, oneXTwo === "1" && styles.optionSelected]} onPress={() => setOneXTwo("1")}>
              <Text style={styles.optionText}>Gana {team1 || "Equipo 1"}</Text>
            </TouchableOpacity>
            {drawEnabled && (
              <TouchableOpacity style={[styles.option, oneXTwo === "X" && styles.optionSelected]} onPress={() => setOneXTwo("X")}>
                <Text style={styles.optionText}>Empate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.option, oneXTwo === "2" && styles.optionSelected]} onPress={() => setOneXTwo("2")}>
              <Text style={styles.optionText}>Gana {team2 || "Equipo 2"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.optionText}>Permitir empate</Text>
            <Switch value={drawEnabled} onValueChange={setDrawEnabled} trackColor={{ true: "#28a745", false: "#888" }}/>
          </View>

          {/* Estadísticas */}
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          {[
            { label: `Goles ${team1 || "Equipo 1"}`, value: scoreTeam1, setter: setScoreTeam1 },
            { label: `Goles ${team2 || "Equipo 2"}`, value: scoreTeam2, setter: setScoreTeam2 },
            { label: `HT ${team1 || "Equipo 1"}`, value: halfTimeTeam1, setter: setHalfTimeTeam1 },
            { label: `HT ${team2 || "Equipo 2"}`, value: halfTimeTeam2, setter: setHalfTimeTeam2 },
            { label: `Corners ${team1 || "Equipo 1"}`, value: cornersTeam1, setter: setCornersTeam1 },
            { label: `Corners ${team2 || "Equipo 2"}`, value: cornersTeam2, setter: setCornersTeam2 },
            { label: `Tiros ${team1 || "Equipo 1"}`, value: shotsTeam1, setter: setShotsTeam1 },
            { label: `Tiros ${team2 || "Equipo 2"}`, value: shotsTeam2, setter: setShotsTeam2 },
            { label: `Faltas ${team1 || "Equipo 1"}`, value: foulsTeam1, setter: setFoulsTeam1 },
            { label: `Faltas ${team2 || "Equipo 2"}`, value: foulsTeam2, setter: setFoulsTeam2 },
            { label: `Amarillas ${team1 || "Equipo 1"}`, value: yellowTeam1, setter: setYellowTeam1 },
            { label: `Amarillas ${team2 || "Equipo 2"}`, value: yellowTeam2, setter: setYellowTeam2 },
            { label: `Rojas ${team1 || "Equipo 1"}`, value: redTeam1, setter: setRedTeam1 },
            { label: `Rojas ${team2 || "Equipo 2"}`, value: redTeam2, setter: setRedTeam2 },
          ].map((field, i) => (
            <TextInput
              key={i}
              placeholder={field.label}
              style={styles.input}
              keyboardType="numeric"
              value={field.value}
              onChangeText={field.setter}
              placeholderTextColor="#aaa"
            />
          ))}

          {/* Primer gol */}
          <Text style={styles.sectionTitle}>Primer Gol</Text>
          <View style={styles.betOptions}>
            <TouchableOpacity style={[styles.option, firstGoal === "team1" && styles.optionSelected]} onPress={() => setFirstGoal("team1")}>
              <Text style={styles.optionText}>{team1 || "Equipo 1"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.option, firstGoal === "team2" && styles.optionSelected]} onPress={() => setFirstGoal("team2")}>
              <Text style={styles.optionText}>{team2 || "Equipo 2"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.option, firstGoal === "ninguno" && styles.optionSelected]} onPress={() => setFirstGoal("ninguno")}>
              <Text style={styles.optionText}>Ninguno</Text>
            </TouchableOpacity>
          </View>

          {/* Extra */}
          <TextInput placeholder="Observación (draw)" style={styles.input} value={draw} onChangeText={setDraw} placeholderTextColor="#aaa"/>
          <TextInput placeholder="Ganador final (winner)" style={styles.input} value={winner || ""} onChangeText={setWinner} placeholderTextColor="#aaa"/>

        </View>
      </ScrollView>

      {/* Resumen */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>📋 Resumen</Text>
        <Text style={styles.summaryText}>{team1 || "Equipo 1"} vs {team2 || "Equipo 2"}</Text>
        <Text style={styles.summaryText}>Descripción: {description}</Text>
        <Text style={styles.summaryText}>Costo mínimo: ${cost || 0}</Text>
        <Text style={styles.summaryText}>Estado: {status}</Text>
        <Text style={styles.summaryText}>Resultado principal: {oneXTwo || "No definido"}</Text>
        <Text style={styles.summaryText}>Primer Gol: {firstGoal || "No definido"}</Text>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => router.push("/main/(tabs)/eventos")}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.createButton]} onPress={handleCreateBet}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20 },
  container: { flex: 1 },
  title: { fontSize: 26, color: "#FFD700", marginBottom: 20, textAlign: "center" },
  input: { backgroundColor: "#1c2a2b", padding: 14, borderRadius: 12, marginBottom: 12, color: "#fff" },
  dateButton: { backgroundColor: "#1c2a2b", padding: 14, borderRadius: 12, marginBottom: 12 },
  sectionTitle: { color: "#FFD700", fontWeight: "bold", marginTop: 15, marginBottom: 5, fontSize: 16 },
  betOptions: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  option: { flex: 1, padding: 10, backgroundColor: "#1c2a2b", marginHorizontal: 5, borderRadius: 10, alignItems: "center" },
  optionSelected: { backgroundColor: "#28a745" },
  optionText: { color: "#fff", fontSize: 14 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1c2a2b", padding: 10, borderRadius: 10, marginBottom: 10 },
  summary: { padding: 15, backgroundColor: "#142e38", borderTopWidth: 2, borderTopColor: "#FFD700" },
  summaryTitle: { color: "#FFD700", fontWeight: "bold", marginBottom: 10, fontSize: 18 },
  summaryText: { color: "#fff", marginBottom: 5 },
  buttonsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  button: { flex: 0.48, padding: 14, borderRadius: 12, alignItems: "center" },
  cancelButton: { backgroundColor: "#dc3545" },
  createButton: { backgroundColor: "#28a745" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
