import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { color, font, fontSize, radius, space } from "@/theme/tokens";

const STEP = 5;
const MIN_PRICE = 5;

export default function PriceStepper({
  price,
  onChange,
}: {
  price: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(Math.max(MIN_PRICE, price - STEP))}
        style={styles.stepButton}
      >
        <Text style={styles.stepLabel}>−</Text>
      </Pressable>
      <Text style={styles.price}>
        {t("common.currencySymbol")}
        {price}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(price + STEP)}
        style={styles.stepButton}
      >
        <Text style={styles.stepLabel}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.hairline,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontFamily: font.bodyBold,
    fontSize: 22,
    color: color.ink,
  },
  price: {
    fontFamily: font.display,
    fontSize: fontSize.priceNumeral,
    color: color.ink,
    minWidth: 110,
    textAlign: "center",
  },
});
