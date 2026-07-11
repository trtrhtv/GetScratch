import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, fontSize, radius, space } from "@/theme/tokens";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

// בורר-פלחים אחיד — עוצמה/משך/אזור בהזמנה, ותפקידים דומים במסכים אחרים.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: color.slateSoft,
  },
  label: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.body,
    color: color.inkMuted,
  },
  labelActive: {
    color: color.slate,
    fontFamily: font.bodySemiBold,
  },
});
