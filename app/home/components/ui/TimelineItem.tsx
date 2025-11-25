import { StyleSheet, Text, View } from "react-native";

type TimelineItemProps = {
  hour: string;
  text: string;
  highlight?: boolean;
};

export default function TimelineItem({
  hour,
  text,
  highlight,
}: TimelineItemProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, highlight && styles.dotHighlight]} />
      <View style={styles.line} />
      <View style={styles.content}>
        <Text style={styles.hour}>{hour}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#9bc7b4",
    marginTop: 4,
  },
  dotHighlight: {
    backgroundColor: "#d7b45f",
  },
  line: {
    width: 1,
    backgroundColor: "#2d4e52",
    marginHorizontal: 12,
  },
  content: {
    flex: 1,
  },
  hour: {
    color: "#d7b45f",
    fontSize: 14,
  },
  text: {
    color: "#f3f7f5",
    fontSize: 14,
  },
});
