import { ScrollView, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import ScratcherListRow from "./ScratcherListRow";
import Banner from "./Banner";
import { color, font, fontSize, space } from "@/theme/tokens";
import type { ScratcherProfile } from "@/backend/types";

// גרסת ה-web: ללא מפת native (react-native-maps אינו נתמך ב-web) — רשימה
// ממוינת-מרחק במקום, כפי שנקבע ב-DESIGN.md §5 וב-README התוכנית (fallback).
export default function NearbyPanel({
  scratchers,
  selectedId,
  onSelect,
}: {
  scratchers: ScratcherProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.notice}>{t("home.webMapNotice")}</Text>
      {scratchers.length === 0 ? (
        <Banner text={t("home.emptyNearby")} />
      ) : (
        scratchers.map((s) => (
          <ScratcherListRow
            key={s.id}
            scratcher={s}
            selected={s.id === selectedId}
            onPress={() => onSelect(s.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: space.lg,
  },
  notice: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkFaint,
    marginBottom: space.md,
    textAlign: "auto",
  },
});
