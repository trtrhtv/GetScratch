import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { color, font, fontSize, lineHeight, space } from "@/theme/tokens";

// שלד זמני לשלב 1.5 — שלב 4 יחליף את זה בלוגיקת ניתוב (onboarding vs. home).
export default function Index() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("common.appName")}</Text>
      <Text style={styles.subtitle}>{t("onboarding.welcome.subtitle")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.paper,
    paddingStart: space.xl,
    paddingEnd: space.xl,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.hero,
    lineHeight: lineHeight.hero,
    color: color.ink,
    marginBottom: space.sm,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
    color: color.inkMuted,
    textAlign: "center",
  },
});
