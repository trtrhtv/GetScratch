import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Svg, { Path } from "react-native-svg";
import { color, font, fontSize, radius, space } from "@/theme/tokens";
import type { BackZone } from "@/backend/types";

// אלמנט החתימה (DESIGN.md §4) — קונטור גב מופשט (לא איור מגוף אדם), פונקציונלי
// כבורר-אזור. משמש רק כאן ובמסך ההמתנה (רדאר) — לא בשום מקום אחר באפליקציה.
const ZONE_SHAPES: { id: BackZone; d: string }[] = [
  { id: "shoulders", d: "M20,28 Q50,10 80,28 L80,42 Q50,26 20,42 Z" },
  { id: "betweenShoulders", d: "M20,42 Q50,26 80,42 L80,58 Q50,44 20,58 Z" },
  { id: "upper", d: "M20,58 Q50,44 80,58 L80,76 Q50,62 20,76 Z" },
  { id: "lower", d: "M20,76 Q50,62 80,76 L80,94 Q50,80 20,94 Z" },
];

const ZONE_LABEL_KEYS = {
  upper: "order.create.zones.upper",
  lower: "order.create.zones.lower",
  betweenShoulders: "order.create.zones.betweenShoulders",
  shoulders: "order.create.zones.shoulders",
} as const satisfies Record<BackZone, string>;

export default function ContourBackMap({
  selected,
  onSelect,
}: {
  selected: BackZone | null;
  onSelect: (zone: BackZone) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Svg viewBox="0 0 100 100" width="100%" height={220}>
        {ZONE_SHAPES.map((zone) => (
          <Path
            key={zone.id}
            d={zone.d}
            fill={selected === zone.id ? color.slate : color.slateSoft}
            stroke={color.paper}
            strokeWidth={1.5}
            onPress={() => onSelect(zone.id)}
          />
        ))}
      </Svg>
      <View style={styles.legend}>
        {ZONE_SHAPES.map((zone) => (
          <Pressable
            key={zone.id}
            onPress={() => onSelect(zone.id)}
            style={[styles.legendItem, selected === zone.id && styles.legendItemActive]}
          >
            <Text style={[styles.legendText, selected === zone.id && styles.legendTextActive]}>
              {t(ZONE_LABEL_KEYS[zone.id])}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: space.md,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.sm,
  },
  legendItem: {
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.full,
    paddingStart: space.md,
    paddingEnd: space.md,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    backgroundColor: color.surface,
  },
  legendItemActive: {
    backgroundColor: color.slate,
    borderColor: color.slate,
  },
  legendText: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.label,
    color: color.inkMuted,
  },
  legendTextActive: {
    color: color.white,
  },
});
