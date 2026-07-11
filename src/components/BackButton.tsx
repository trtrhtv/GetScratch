import { I18nManager, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import { color, space } from "@/theme/tokens";

// כפתור חזרה עצמאי (headerShown:false גלובלי — כל מסך שצריך יציאה מוסיף
// את זה בעצמו, בהתאם לצ'אט/מפה המינימליים של DESIGN.md). כיוון החץ עוקב
// אחרי RTL/LTR הנוכחי.
export default function BackButton() {
  const Icon = I18nManager.isRTL ? ChevronRight : ChevronLeft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="back"
      hitSlop={8}
      onPress={() => router.back()}
      style={styles.button}
    >
      <Icon size={24} color={color.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    marginTop: space.sm,
  },
});
