import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { color, font, fontSize, radius, space } from "@/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

// כפתור בודד לכל וריאנט — הכפתור הדומיננטי (primary/amber) חייב להישאר יחיד
// למסך (ראו DESIGN.md §6.4: "כפתור פעולה אחד דומיננטי").
export default function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive }}
      onPress={isInteractive ? onPress : undefined}
      style={({ pressed }) => [
        styles.base,
        VARIANT_STYLES[variant],
        !isInteractive && styles.disabled,
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={TEXT_COLOR[variant]} />
      ) : (
        <Text style={[styles.label, { color: TEXT_COLOR[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: color.ink,
  secondary: color.ink,
  danger: color.white,
  ghost: color.slate,
};

const VARIANT_STYLES = StyleSheet.create({
  primary: {
    backgroundColor: color.amber,
  },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  danger: {
    backgroundColor: color.brick,
  },
  ghost: {
    backgroundColor: "transparent",
  },
});

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingStart: space.lg,
    paddingEnd: space.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.button,
  },
});
