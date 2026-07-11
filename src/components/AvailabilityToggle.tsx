import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, fontSize, radius, space } from "@/theme/tokens";

// הטוגל הבולט "אני זמין/ה לגרד" — ראש מסך הבית. slate/teal כשפעיל, לא ירוק-רמזור
// גנרי (ה-sage שמור לסטטוס הזמנה מוצלחת, לא לזמינות).
export default function AvailabilityToggle({
  isAvailable,
  onToggle,
}: {
  isAvailable: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isAvailable }}
      onPress={() => onToggle(!isAvailable)}
      style={[styles.container, isAvailable && styles.containerActive]}
    >
      <Text style={[styles.label, isAvailable && styles.labelActive]}>
        {t("home.availableToggle")}
      </Text>
      <View style={[styles.track, isAvailable && styles.trackActive]}>
        <View style={[styles.thumb, isAvailable && styles.thumbActive]} />
      </View>
    </Pressable>
  );
}

const TRACK_WIDTH = 48;
const TRACK_HEIGHT = 28;
const THUMB_SIZE = 22;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.lg,
    paddingStart: space.lg,
    paddingEnd: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  containerActive: {
    backgroundColor: color.slateSoft,
    borderColor: color.slate,
  },
  label: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
  },
  labelActive: {
    color: color.slate,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.full,
    backgroundColor: color.hairline,
    justifyContent: "center",
    padding: 3,
  },
  trackActive: {
    backgroundColor: color.slate,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.full,
    backgroundColor: color.white,
    alignSelf: "flex-start",
  },
  thumbActive: {
    alignSelf: "flex-end",
  },
});
