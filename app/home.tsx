import { StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import ScreenContainer from "@/components/ScreenContainer";
import { color, font, fontSize } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";

// שלד זמני לשלב 4 — שלב 5 יבנה כאן את מסך הבית האמיתי (מפה/רשימה, טוגל זמינות).
export default function HomeScreen() {
  const { t } = useTranslation();
  const name = useAppStore((s) => s.user?.name);

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t("common.appName")}</Text>
      {name ? <Text style={styles.subtitle}>{name}</Text> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    marginTop: 24,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
    textAlign: "center",
    marginTop: 8,
  },
});
