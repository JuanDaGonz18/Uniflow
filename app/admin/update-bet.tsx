import { supabase } from "@/utils/supabase";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import { Alert, Button, ScrollView, Text, TextInput } from "react-native";

type RootStackParamList = {
  UpdateBet: { betId: string };
};

type UpdateBetScreenRouteProp = RouteProp<RootStackParamList, "UpdateBet">;
type UpdateBetScreenNavigationProp = StackNavigationProp<RootStackParamList, "UpdateBet">;

type Props = {
  route: UpdateBetScreenRouteProp;
  navigation: UpdateBetScreenNavigationProp;
};

export default function UpdateBetScreen({ route, navigation }: Props) {
  const { betId } = route.params; // id de la apuesta seleccionada
  const [loading, setLoading] = useState(false);
  const [bet, setBet] = useState<any>(null);

  const [description, setDescription] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [cost, setCost] = useState("0");

  useEffect(() => {
    const fetchBet = async () => {
      const { data, error } = await supabase.from("bets").select("*").eq("id", betId).single();
      if (error) {
        Alert.alert("Error", error.message);
      } else if (data) {
        setBet(data);
        setDescription(data.description);
        setTeam1(data.team1);
        setTeam2(data.team2);
        setCost(data.cost.toString());
      }
    };
    fetchBet();
  }, [betId]);

  const updateBet = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("bets")
      .update({
        description,
        team1,
        team2,
        cost: parseFloat(cost),
      })
      .eq("id", betId);

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Listo", "Apuesta actualizada");
      navigation.goBack();
    }
  };

  if (!bet) return <Text>Cargando...</Text>;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Editar Apuesta</Text>

      <Text>Descripción:</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Text>Equipo 1:</Text>
      <TextInput
        value={team1}
        onChangeText={setTeam1}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Text>Equipo 2:</Text>
      <TextInput
        value={team2}
        onChangeText={setTeam2}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Text>Costo mínimo:</Text>
      <TextInput
        value={cost}
        keyboardType="numeric"
        onChangeText={setCost}
        style={{ borderWidth: 1, marginBottom: 10, padding: 8 }}
      />

      <Button title={loading ? "Guardando..." : "Actualizar"} onPress={updateBet} />
    </ScrollView>
  );
}
