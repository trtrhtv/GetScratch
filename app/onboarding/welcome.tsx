import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import { color, font, fontSize, lineHeight, space } from "@/theme/tokens";

export default function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{t("onboarding.welcome.title")}</Text>
        <Text style={styles.subtitle}>{t("onboarding.welcome.subtitle")}</Text>
        <Text style={styles.description}>{t("onboarding.welcome.description")}</Text>
      </View>
      <Button
        label={t("onboarding.welcome.cta")}
        onPress={() => router.push("/onboarding/signup")}
        style={styles.cta}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.hero + 8,
    color: color.ink,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
    color: color.ink,
    textAlign: "center",
    maxWidth: 300,
  },
  description: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: color.inkMuted,
    textAlign: "center",
    maxWidth: 300,
  },
  cta: {
    marginBottom: space.lg,
  },
});
