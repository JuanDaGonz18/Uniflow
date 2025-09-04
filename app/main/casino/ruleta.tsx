// app/main/casino/ruleta.tsx
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

export default function RuletaScreen() {
  const router = useRouter();
  const { user, saldo, setSaldo } = useAuth();

  const [numero, setNumero] = useState<number | null>(null);
  const [girando, setGirando] = useState(false);
  const [apuesta, setApuesta] = useState<string | null>(null);
  const [monto, setMonto] = useState<number>(0);

  const spinValue = useRef(new Animated.Value(0)).current;
  const sectorCount = 37;

  const secuencia = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34,
    6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
    29, 7, 28, 12, 35, 3, 26
  ];

  const rojos = [
    1,3,5,7,9,12,14,16,18,19,21,23,
    25,27,30,32,34,36
  ];

  const getColor = (n: number) => {
    if (n === 0) return "#00e676";
    if (rojos.includes(n)) return "#ff1744";
    return "#111";
  };

  const fichas = [
    { valor: 100, color: "#a7a7a7ff" }, { valor: 200, color: "#FFD700" }, { valor: 500, color: "#d32f2f" },
    { valor: 1000, color: "#2e7d32" }, { valor: 2000, color: "#9e9e9e" }, { valor: 2500, color: "#1565c0" },
    { valor: 5000, color: "#ff9800" }, { valor: 10000, color: "#000" }, { valor: 25000, color: "#e91e63" },
    { valor: 50000, color: "#6a1b9a" }, { valor: 100000, color: "#800000" }, { valor: 200000, color: "#03a9f4" },
    { valor: 500000, color: "#5d4037" }, { valor: 1000000, color: "#a1887f" },
  ];

  // Tabla de pagos
  const payoutTable: Record<string, number> = {
    cero: 35,
    directa: 35,
    division: 17,
    fila: 11,
    esquina: 8,
    cinco: 6,
    filaDoble: 5,
    columna: 2,
    docena: 2,
    par: 1,
    impar: 1,
    rojo: 1,
    negro: 1,
    bajo: 1,
    alto: 1,
  };

  const guardarMovimiento = async (delta: number, descripcion: string) => {
    if (!user) return;
    const nuevoSaldo = (saldo ?? 0) + delta;
    setSaldo(nuevoSaldo);

    try {
      await supabase.from("profiles").update({ points: nuevoSaldo }).eq("id", user.id);
      await supabase.from("movimientos").insert([{
        user_id: user.id,
        tipo: delta > 0 ? "Juego (Ganado)" : "Juego (Perdido)",
        monto: delta,
        descripcion,
      }]);
    } catch (err: any) {
      console.error("Error guardando movimiento:", err.message || err);
    }
  };

  const calcularPremio = (tipo: string, monto: number) => {
    const ratio = payoutTable[tipo] ?? 0;
    return monto * ratio;
  };

  const validarGanador = (tipo: string, resultado: number): boolean => {
    switch (tipo) {
      case "rojo": return rojos.includes(resultado);
      case "negro": return resultado !== 0 && !rojos.includes(resultado);
      case "par": return resultado !== 0 && resultado % 2 === 0;
      case "impar": return resultado % 2 === 1;
      case "bajo": return resultado >= 1 && resultado <= 18;
      case "alto": return resultado >= 19 && resultado <= 36;
      case "cero": return resultado === 0;
      default: return false;
    }
  };

  const girarRuleta = () => {
    if (girando || !apuesta || monto <= 0) {
      Alert.alert("⚠️ Selecciona un monto y apuesta válida");
      return;
    }
    if ((saldo ?? 0) < monto) {
      Alert.alert("💸 Sin saldo", "No tienes suficiente saldo para esa apuesta.");
      return;
    }

    setGirando(true);
    setNumero(null);
    spinValue.stopAnimation();
    spinValue.setValue(0);

    const resultadoIndex = Math.floor(Math.random() * sectorCount);
    const resultado = secuencia[resultadoIndex];

    const stepsToBring = (sectorCount - resultadoIndex) % sectorCount;
    const offsetSteps = 0.5;
    const rotations = Math.floor(Math.random() * 5) + 8; // más vueltas
    const spinStepsTarget = rotations * sectorCount + stepsToBring - offsetSteps;

    const duration = 4500 + rotations * 500; // más duración

    Animated.timing(spinValue, {
      toValue: spinStepsTarget,
      duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(async () => {
      setNumero(resultado);

      const gano = validarGanador(apuesta, resultado);

      await guardarMovimiento(-monto, `Apuesta en ruleta (${apuesta})`);
      if (gano) {
        const premio = calcularPremio(apuesta, monto);
        await guardarMovimiento(premio, `Premio en ruleta (${apuesta})`);
        Alert.alert("🎉 ¡Ganaste!", `Número: ${resultado} | Premio: +COL$${premio.toLocaleString('es-CO')}`);
      } else {
        Alert.alert("😢 Perdiste", `Número: ${resultado}`);
      }

      setGirando(false);
      setMonto(0);
    });
  };

  const degPerSector = 360 / sectorCount;
  const maxRotations = 25;
  const maxSteps = sectorCount * maxRotations;
  const rotate = spinValue.interpolate({
    inputRange: [0, maxSteps],
    outputRange: ["0deg", `${maxSteps * degPerSector}deg`],
    extrapolate: "clamp",
  });

  const renderWheel = () => {
    const size = 300;
    const radius = size / 2;
    const angle = (2 * Math.PI) / sectorCount;

    const paths: React.ReactNode[] = [];

    for (let i = 0; i < sectorCount; i++) {
      const start = i * angle - Math.PI / 2;
      const end = (i + 1) * angle - Math.PI / 2;

      const x1 = radius + radius * Math.cos(start);
      const y1 = radius + radius * Math.sin(start);
      const x2 = radius + radius * Math.cos(end);
      const y2 = radius + radius * Math.sin(end);

      const largeArc = end - start > Math.PI ? 1 : 0;
      const num = secuencia[i];
      const color = getColor(num);

      const d = `M ${radius},${radius} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;

      const textAngle = start + angle / 2;
      const textX = radius + (radius - 30) * Math.cos(textAngle);
      const textY = radius + (radius - 30) * Math.sin(textAngle);

      paths.push(
        <G key={i}>
          <Path d={d} fill={color} stroke="#FFD700" strokeWidth={1} />
          <SvgText
            x={textX}
            y={textY}
            fill={"#fff"}
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
            alignmentBaseline="middle"
            transform={`rotate(${(textAngle * 180) / Math.PI + 90}, ${textX}, ${textY})`}
          >
            {num}
          </SvgText>
        </G>
      );
    }

    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
          <Svg width={size} height={size}>
            <G>{paths}</G>
            <Circle cx={radius} cy={radius} r={40} fill="rgba(0,0,0,0.85)" />
          </Svg>
        </Animated.View>

        <View
          style={{
            position: "absolute",
            left: radius - 8,
            top: 6,
            width: 16,
            height: 16,
            transform: [{ rotate: "45deg" }],
            backgroundColor: "#FFD700",
            borderRadius: 2,
            elevation: 6,
          }}
        />

        {!girando && numero !== null && (
          <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
            <Text
              style={{
                fontSize: 42,
                fontWeight: "700",
                color: getColor(numero),
                textShadowColor: getColor(numero) === "#111" ? "#fff" : "#000",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 4,
              }}
            >
              {numero}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={["#041c13", "#092e20", "#041c13"]} style={styles.background}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>⬅️</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <Text style={styles.title}>Ruleta</Text>
        <Text style={styles.saldo}>Saldo: COL${(saldo ?? 0).toLocaleString('es-CO')}</Text>


        {renderWheel()}

        <Text style={styles.monto}>Monto: COL${monto}</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.fichasRow}
          contentContainerStyle={{ alignItems: "center", paddingHorizontal: 10 }}
        >
          {fichas.map((f) => (
            <TouchableOpacity
              key={f.valor}
              style={[styles.ficha, { backgroundColor: f.color }]}
              onPress={() => setMonto((prev) => prev + f.valor)}
              disabled={girando}
            >
              <Text style={styles.fichaText}>COL${f.valor.toLocaleString('es-CO')}</Text>

            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, { backgroundColor: "#555" }]} onPress={() => setMonto(0)}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.allInButton]}
            onPress={() => setMonto(saldo ?? 0)}
            disabled={girando}
          >
            <Text style={styles.buttonText}>ALL IN</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {["rojo", "negro", "par", "impar", "bajo", "alto", "cero"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.cell, apuesta === t && styles.active]}
              onPress={() => setApuesta(t)}
              disabled={girando}
            >
              <Text style={styles.cellText}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, girando && { backgroundColor: "#444" }]}
          onPress={girarRuleta}
          disabled={girando}
        >
          <Text style={styles.buttonText}>{girando ? "Girando..." : "🎰 Girar"}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 25, paddingTop: 40, paddingBottom: 20 },
  title: { fontSize: 28, color: "#FFD700", marginBottom: 10, textAlign: "center" },
  saldo: { fontSize: 20, color: "#fff", marginBottom: 15, textAlign: "center" },
  monto: { fontSize: 22, color: "#FFD700", marginVertical: 10 },
  fichasRow: { marginVertical: 20, maxHeight: 100, width: "100%" },
  ficha: { borderRadius: 30, padding: 10, marginHorizontal: 4, borderWidth: 2, borderColor: "#FFD700", minWidth: 50, alignItems: "center", justifyContent: "center" },
  fichaText: { color: "#fff", fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "center", marginVertical: 10, width: "100%" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 25, marginTop: 10 },
  cell: { backgroundColor: "rgba(255,255,255,0.05)", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, margin: 4, borderWidth: 1, borderColor: "rgba(255,215,0,0.3)" },
  cellText: { color: "#fff", fontSize: 12 },
  active: { borderColor: "#FFD700", backgroundColor: "rgba(255,215,0,0.2)" },
  button: { backgroundColor: "#14532d", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", marginHorizontal: 6 },
  buttonText: { color: "#FFD700", fontSize: 14 },
  allInButton: { backgroundColor: "#661111", paddingHorizontal: 16, borderRadius: 12 },
  backButton: { position: "absolute", top: 40, left: 20, padding: 8 },
  backText: { fontSize: 22, color: "#FFD700" },
});
