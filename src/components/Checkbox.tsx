import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { color, font, fontSize, lineHeight, radius, space } from "@/theme/tokens";

export default function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onToggle(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Check size={16} color={color.white} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.hairline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  boxChecked: {
    backgroundColor: color.slate,
    borderColor: color.slate,
  },
  label: {
    flex: 1,
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: color.ink,
  },
});
