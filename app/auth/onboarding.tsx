import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Onboarding() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { opacity }]}>NEURA</Animated.Text>
      <Text style={styles.title}>Todo en una sola app, diseñada para ti</Text>

      <View style={styles.card}>
        <Text style={styles.subtitle}>¿Qué hace AURA?</Text>

        <View style={styles.list}>
          <Text style={styles.item}>• Gestor unificado para estudiantes</Text>
          <Text style={styles.item}>• Integración con sistemas institucionales</Text>
          <Text style={styles.item}>• Organización inteligente de horarios</Text>
          <Text style={styles.item}>• Recordatorios y sincronización</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.replace("/auth/login")}
      >
        <Text style={styles.btnText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051f20",
    padding: 40,
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 30,
    marginBottom: 30,
    fontFamily: "EB_Garamond",
  },
  subtitle: {
    color: "#8eb69b",
    fontSize: 22,
    fontFamily: "EB_Garamond",
  },
  item: {
    color: "white",
    fontSize: 16,
    fontFamily: "Newsreader",
  },
  card: {
    backgroundColor: "#0b2b26",
    padding: 25,
    borderRadius: 16,
  },
  list: {
    gap: 6,
  },
  btn: {
    backgroundColor: "#8eb69b",
    padding: 15,
    borderRadius: 12,
    marginTop: 40,
    alignItems: "center",
  },
  btnText: {
    color: "#051f20",
    fontWeight: "bold",
    fontSize: 16,
  },
});
