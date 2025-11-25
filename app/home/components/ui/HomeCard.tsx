import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type HomeCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  big?: boolean;
};

export default function HomeCard({ title, icon, route, big }: HomeCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, big && styles.bigCard]}
      onPress={() => router.push(route)}
    >
      <View style={styles.left}>
        <Ionicons name={icon} size={26} color="#f3f7f5" />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#f3f7f5" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1f4d4c",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bigCard: {
    height: 90,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: "#f3f7f5",
    fontSize: 16,
    fontWeight: "500",
  },
});
