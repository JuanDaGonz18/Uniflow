import { AuthProvider } from "@/contexts/AuthContext";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [loaded] = useFonts({
  EB_Garamond: require("../assets/fonts/EBGaramond-VariableFont_wght.ttf"),
  Newsreader: require("../assets/fonts/Newsreader-VariableFont.ttf"),
});


  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8eb69b" />
      </View>
    );
    
  }return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
