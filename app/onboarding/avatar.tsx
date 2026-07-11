import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import AvatarPicker from "@/components/AvatarPicker";
import { color, font, fontSize, space } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";
import type { AvatarPresetId } from "@/utils/avatarPresets";

export default function AvatarScreen() {
  const { t } = useTranslation();
  const updateAvatar = useAppStore((s) => s.updateAvatar);
  const currentAvatarId = useAppStore((s) => s.user?.avatarId ?? null);
  const [selected, setSelected] = useState<AvatarPresetId | null>(
    (currentAvatarId as AvatarPresetId | null) ?? "a1"
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue(): Promise<void> {
    if (!selected) return;
    setSubmitting(true);
    try {
      await updateAvatar(selected);
      router.push("/onboarding/terms");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{t("onboarding.avatar.title")}</Text>
        <Text style={styles.subtitle}>{t("onboarding.avatar.subtitle")}</Text>
        <AvatarPicker value={selected} onChange={setSelected} />
      </View>
      <Button
        label={t("onboarding.avatar.cta")}
        onPress={handleContinue}
        loading={submitting}
        disabled={!selected}
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
    gap: space.lg,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: space.sm,
  },
  cta: {
    marginBottom: space.lg,
  },
});
