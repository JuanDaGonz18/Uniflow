import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

export default function Splash() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      router.replace("/auth/onboarding");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, { opacity }]}>NEURA</Animated.Text>
      <Animated.Text style={[styles.sub, { opacity }]}>
        Tu campus, tu tiempo bajo control
      </Animated.Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#051f20",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
  fontSize: 36,
  color: "#fff",
  fontFamily: "EB_Garamond",
  textAlign: "center",

},

sub: {
  marginTop: 10,
  fontSize: 20,
  color: "#8eb69b",
  fontFamily: "Newsreader",
},

});
