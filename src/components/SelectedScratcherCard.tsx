import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react-native";
import Avatar from "./Avatar";
import Button from "./Button";
import Card from "./Card";
import { color, font, fontSize, space } from "@/theme/tokens";
import type { ScratcherProfile } from "@/backend/types";
import { ZONE_LABEL_KEYS, INTENSITY_LABEL_KEYS } from "@/utils/specialtyLabels";

export default function SelectedScratcherCard({
  scratcher,
  onOrder,
}: {
  scratcher: ScratcherProfile;
  onOrder: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.header}>
        <Avatar name={scratcher.name} avatarId={scratcher.avatarId} size="lg" />
        <View style={styles.info}>
          <Text style={styles.name}>{scratcher.name}</Text>
          <View style={styles.metaRow}>
            <Star size={14} color={color.amber} fill={color.amber} />
            <Text style={styles.meta}>{scratcher.rating.average.toFixed(2)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>
              {scratcher.completedCount} {t("home.scratchCountLabel")}
            </Text>
          </View>
          <Text style={styles.specialty}>
            {t("home.specialtyLabel")}: {t(ZONE_LABEL_KEYS[scratcher.specialty.zone])},{" "}
            {t(INTENSITY_LABEL_KEYS[scratcher.specialty.intensity])}
          </Text>
        </View>
      </View>
      <Button label={t("home.orderCta")} onPress={onOrder} style={styles.cta} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: space.md,
    marginBottom: space.lg,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
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
  specialty: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.label,
    color: color.inkMuted,
    marginTop: space.xs,
  },
  cta: {},
});
