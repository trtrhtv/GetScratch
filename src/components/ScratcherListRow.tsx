import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react-native";
import Avatar from "./Avatar";
import { color, font, fontSize, radius, space } from "@/theme/tokens";
import type { ScratcherProfile } from "@/backend/types";
import { ZONE_LABEL_KEYS, INTENSITY_LABEL_KEYS } from "@/utils/specialtyLabels";

export default function ScratcherListRow({
  scratcher,
  selected,
  onPress,
}: {
  scratcher: ScratcherProfile;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="button"
    >
      <Avatar name={scratcher.name} avatarId={scratcher.avatarId} size="md" />
      <View style={styles.info}>
        <Text style={styles.name}>{scratcher.name}</Text>
        <View style={styles.metaRow}>
          <Star size={13} color={color.amber} fill={color.amber} />
          <Text style={styles.meta}>{scratcher.rating.average.toFixed(2)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>
            {t(ZONE_LABEL_KEYS[scratcher.specialty.zone])},{" "}
            {t(INTENSITY_LABEL_KEYS[scratcher.specialty.intensity])}
          </Text>
        </View>
      </View>
      <Text style={styles.distance}>
        {scratcher.distanceKm} {t("common.distanceUnit")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.hairline,
    backgroundColor: color.surface,
    marginBottom: space.sm,
  },
  rowSelected: {
    borderColor: color.slate,
    backgroundColor: color.slateSoft,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.body,
    color: color.ink,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkMuted,
  },
  metaDot: {
    color: color.inkFaint,
  },
  distance: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.caption,
    color: color.inkMuted,
  },
});
