import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface Props {
  onSend: (text: string) => void;
  loading?: boolean;
}

export default function ChatInput({ onSend, loading = false }: Props) {
  const [text, setText] = useState("");

  const handlePress = () => {
    if (!text.trim() || loading) return;
    onSend(text);
    setText("");
  };

  const handleSubmit = () => {
    if (!text.trim() || loading) return;
    handlePress();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje a AURA..."
          placeholderTextColor="#9bc7b4"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSubmit}
          editable={!loading}
          multiline
          maxLength={500}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, (!text.trim() || loading) && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={!text.trim() || loading}
      >
        <Text style={styles.buttonText}>➤</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 16,
    backgroundColor: "#10282b",
    borderTopWidth: 1,
    borderTopColor: "rgba(215, 180, 95, 0.2)",
    alignItems: "flex-end",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#15363a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(215, 180, 95, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
  input: {
    color: "#f3f7f5",
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#d7b45f",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  buttonDisabled: {
    backgroundColor: "#15363a",
    opacity: 0.5,
  },
  buttonText: {
    color: "#0d1f23",
    fontSize: 20,
    fontWeight: "600",
  },
});
