import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import { color, font, fontSize, lineHeight, space } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";

// אותו מסך משמש גם לאישור הראשוני באונבורדינג וגם לעיון חוזר מהפרופיל —
// כשהאונבורדינג כבר הושלם, מוצג כתצוגה בלבד (בלי checkbox/CTA).
export default function TermsScreen() {
  const { t } = useTranslation();
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const acceptTermsAndFinishOnboarding = useAppStore((s) => s.acceptTermsAndFinishOnboarding);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAgree(): Promise<void> {
    setSubmitting(true);
    try {
      await acceptTermsAndFinishOnboarding();
      router.replace("/home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t("onboarding.terms.title")}</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>{t("onboarding.terms.heading")}</Text>
        <Text style={styles.body}>{t("onboarding.terms.body")}</Text>
      </ScrollView>
      <View style={styles.footer}>
        {onboardingCompleted ? (
          <Button label={t("common.back")} onPress={() => router.back()} variant="secondary" />
        ) : (
          <>
            <Checkbox
              checked={checked}
              onToggle={setChecked}
              label={t("onboarding.terms.checkbox")}
            />
            <Button
              label={t("onboarding.terms.cta")}
              onPress={handleAgree}
              disabled={!checked}
              loading={submitting}
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    marginTop: space.md,
    marginBottom: space.md,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space.lg,
  },
  heading: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
    marginBottom: space.sm,
  },
  body: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: color.inkMuted,
  },
  footer: {
    gap: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
  },
});
