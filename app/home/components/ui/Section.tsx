import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type SectionProps = {
  title: string;
  children: ReactNode;
};

export default function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 24,
  },
  title: {
    color: "#d7b45f",
    fontSize: 18,
    marginBottom: 16,
    fontWeight: "600",
  },
});
