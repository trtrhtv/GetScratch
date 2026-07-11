import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, space } from "@/theme/tokens";

// עטיפה אחידה לכל מסך — רקע paper, ריווח מהסקאלה, כיבוד safe area.
export default function ScreenContainer({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={[styles.container, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.paper,
  },
  container: {
    flex: 1,
  },
  padded: {
    paddingStart: space.lg,
    paddingEnd: space.lg,
  },
});
