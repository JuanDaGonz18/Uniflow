import { AuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display";
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CuentaScreen() {
  const { user, saldo, setSaldo, updateSaldo } = useContext(AuthContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [monto, setMonto] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState<"deposito" | "retiro">("deposito");
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [verTodos, setVerTodos] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  // 🔄 Cargar movimientos y saldo desde DB
  useEffect(() => {
    const fetchMovimientos = async () => {
      if (!user) return;

      try {
        const { data: movimientosDB, error: movErr } = await supabase
          .from("movimientos")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (movErr) throw movErr;
        setMovimientos(movimientosDB ?? []);

        const { data: perfil, error: perfilErr } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        if (perfilErr) throw perfilErr;
        setSaldo(perfil?.points ?? 0);
      } catch (err: any) {
        console.error(err);
        Alert.alert("Error", "No se pudieron cargar los movimientos o saldo.");
      }
    };

    fetchMovimientos();
  }, [user]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: "#fff" }}>Cargando fuentes...</Text>
      </View>
    );
  }

  const handleOperacion = async () => {
    const cantidad = parseFloat(monto);
    if (isNaN(cantidad) || cantidad <= 0) {
      Alert.alert("Error", "Por favor ingresa un monto válido.");
      return;
    }
    if (!user) {
      Alert.alert("Error", "Usuario no autenticado.");
      return;
    }
    if (tipoOperacion === "deposito" && cantidad < 100) {
      Alert.alert("Error", "El depósito mínimo es de $100.");
      return;
    }
    if (tipoOperacion === "retiro" && cantidad > (saldo ?? 0)) {
      Alert.alert("Error", "No tienes saldo suficiente para retirar esa cantidad.");
      return;
    }

    try {
      // Traer saldo desde DB antes de actualizar
      const { data: perfil, error: perfilErr } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .single();
      if (perfilErr) throw perfilErr;

      const nuevoSaldo =
        tipoOperacion === "deposito"
          ? (perfil?.points ?? 0) + cantidad
          : (perfil?.points ?? 0) - cantidad;

      const MAX_SALDO = 9999999999.99;
      if (nuevoSaldo > MAX_SALDO) {
        Alert.alert(
          "Error",
          `El saldo máximo permitido es $${MAX_SALDO.toLocaleString(
            "es-CO"
          )}.`
        );
        return;
      }

      // Actualizar saldo en DB
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ points: nuevoSaldo })
        .eq("id", user.id);
      if (updErr) throw updErr;

      // Insertar movimiento
      const { data: movInsertado, error: movErr } = await supabase
        .from("movimientos")
        .insert([
          {
            user_id: user.id,
            tipo: tipoOperacion === "deposito" ? "Depósito" : "Retiro",
            monto: tipoOperacion === "deposito" ? cantidad : -cantidad,
            descripcion:
              tipoOperacion === "deposito"
                ? "Recarga por transferencia (simulada)"
                : "Retiro de saldo",
          },
        ])
        .select()
        .single();
      if (movErr) throw movErr;

      // Actualizar estado local
      setSaldo(nuevoSaldo);
      if (movInsertado) setMovimientos(prev => [movInsertado, ...prev]);

      setMonto("");
      setModalVisible(false);

      Alert.alert(
        "Éxito",
        tipoOperacion === "deposito"
          ? `Se agregaron $${cantidad} a tu saldo.`
          : `Se retiraron $${cantidad} de tu saldo.`
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "Error",
        err.message || "Ocurrió un error al procesar la operación."
      );
    }
  };

  const mostrar = verTodos ? movimientos : movimientos.slice(0, 3);

  return (
    <LinearGradient
      colors={["#0f2027", "#092e20", "#041c13"]}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>💳 Mi Cuenta</Text>
          <Text style={styles.saldo}>
            Saldo: ${saldo?.toLocaleString("es-CO") ?? 0}
          </Text>

          {mostrar.length === 0 ? (
            <Text style={styles.noMovimientos}>
              No tienes movimientos todavía.
            </Text>
          ) : (
            mostrar.map(mov => (
              <View key={mov.id} style={styles.card}>
                <Text style={styles.cardText}>{mov.tipo}</Text>
                <Text
                  style={[
                    styles.cardAmount,
                    { color: mov.monto >= 0 ? "#00FF7F" : "#FF6347" },
                  ]}
                >
                  {mov.monto >= 0
                    ? `+$${mov.monto.toLocaleString("es-CO")}`
                    : `-$${Math.abs(mov.monto).toLocaleString("es-CO")}`}
                </Text>
              </View>
            ))
          )}

          {movimientos.length > 3 && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setVerTodos(!verTodos)}
            >
              <Text style={styles.buttonText}>
                {verTodos ? "Mostrar menos" : "Mostrar más transferencias"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, { flex: 1, marginRight: 10 }]}
              onPress={() => {
                setTipoOperacion("deposito");
                setModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>Depositar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { flex: 1, backgroundColor: "#661111" }]}
              onPress={() => {
                setTipoOperacion("retiro");
                setModalVisible(true);
              }}
            >
              <Text style={styles.buttonText}>Retirar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {tipoOperacion === "deposito" ? "Agregar fondos" : "Retirar fondos"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ingrese monto"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={monto}
              onChangeText={setMonto}
            />

            {tipoOperacion === "retiro" && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: "#333" }]}
                onPress={() => setMonto(String(saldo ?? 0))}
              >
                <Text style={styles.buttonText}>Retirar todo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.button} onPress={handleOperacion}>
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scroll: { flexGrow: 1 },
  container: { paddingHorizontal: 25, paddingVertical: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  title: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#FFD700",
    marginBottom: 10,
    textAlign: "center",
  },
  saldo: {
    fontSize: 20,
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 20,
    textAlign: "center",
  },
  noMovimientos: {
    color: "#aaa",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
  },
  cardText: {
    color: "#fff",
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
  },
  cardAmount: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#14532d",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#FFD700",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#092e20",
    borderRadius: 16,
    padding: 25,
    width: "90%",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#FFD700",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    color: "#fff",
    padding: 10,
    fontFamily: "Poppins_400Regular",
    marginBottom: 20,
  },
  cancelButton: {
    backgroundColor: "#661111",
  },
});
