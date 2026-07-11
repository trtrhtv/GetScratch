import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { color, font, fontSize, radius, space } from "@/theme/tokens";

export default function TextField({
  label,
  error,
  style,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={color.inkFaint}
        style={[styles.input, Boolean(error) && styles.inputError, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space.lg,
  },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.label,
    color: color.inkMuted,
    marginBottom: space.xs,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    paddingStart: space.md,
    paddingEnd: space.md,
    fontFamily: font.bodyRegular,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
    textAlign: "auto",
  },
  inputError: {
    borderColor: color.brick,
  },
  error: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.brick,
    marginTop: space.xs,
  },
});
