import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "@/theme/tokens";

// שלד זמני לשלב 1 — שלב 4 יחליף את זה בלוגיקת ניתוב (onboarding vs. home).
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
    backgroundColor: theme.color.background,
    paddingStart: 24,
    paddingEnd: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.color.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.color.text,
    textAlign: "center",
  },
});
