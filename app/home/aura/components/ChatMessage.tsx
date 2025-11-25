import type { ChatMessage as ChatMessageType } from "@/types/chats";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.sender === "user";
  const isBot = message.sender === "bot";

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      {isBot && <Text style={styles.botLabel}>AURA</Text>}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textBot]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: "85%",
  },
  userContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  botContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  botLabel: {
    fontSize: 11,
    color: "#9bc7b4",
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
  bubble: {
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#d7b45f",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#15363a",
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  textUser: {
    color: "#0d1f23",
    fontWeight: "500",
  },
  textBot: {
    color: "#f3f7f5",
  },
});
