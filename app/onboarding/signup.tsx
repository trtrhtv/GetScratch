import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { color, font, fontSize, space } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";

function isValidIsraeliMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return /^05\d{8}$/.test(digits);
}

export default function SignupScreen() {
  const { t } = useTranslation();
  const signUp = useAppStore((s) => s.signUp);
  const verifyCode = useAppStore((s) => s.verifyCode);

  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [codeError, setCodeError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSendCode(): Promise<void> {
    const trimmedName = name.trim();
    const validName = trimmedName.length > 0;
    const validPhone = isValidIsraeliMobile(phone);
    setNameError(validName ? undefined : t("onboarding.signup.errorName"));
    setPhoneError(validPhone ? undefined : t("onboarding.signup.errorPhone"));
    if (!validName || !validPhone) return;

    setSubmitting(true);
    try {
      const id = await signUp(trimmedName, phone.trim());
      setUserId(id);
      setStep("code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(): Promise<void> {
    if (!userId) return;
    setSubmitting(true);
    try {
      await verifyCode(userId, code.trim());
      router.push("/onboarding/avatar");
    } catch {
      setCodeError(t("onboarding.signup.errorCode"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.body}>
        {step === "details" ? (
          <>
            <Text style={styles.title}>{t("onboarding.signup.title")}</Text>
            <TextField
              label={t("onboarding.signup.nameLabel")}
              placeholder={t("onboarding.signup.namePlaceholder")}
              value={name}
              onChangeText={setName}
              error={nameError}
              autoComplete="name"
            />
            <TextField
              label={t("onboarding.signup.phoneLabel")}
              placeholder={t("onboarding.signup.phonePlaceholder")}
              value={phone}
              onChangeText={setPhone}
              error={phoneError}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Button
              label={t("onboarding.signup.sendCode")}
              onPress={handleSendCode}
              loading={submitting}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>{t("onboarding.signup.codeTitle")}</Text>
            <Text style={styles.subtitle}>
              {t("onboarding.signup.codeSubtitle", { phone: phone.trim() })}
            </Text>
            <TextField
              label={t("onboarding.signup.codeLabel")}
              value={code}
              onChangeText={setCode}
              error={codeError}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Text style={styles.hint}>{t("onboarding.signup.codeHint")}</Text>
            <Button
              label={t("onboarding.signup.verify")}
              onPress={handleVerify}
              loading={submitting}
              disabled={code.trim().length === 0}
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    gap: space.sm,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    marginBottom: space.lg,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
    textAlign: "center",
    marginBottom: space.lg,
  },
  hint: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkFaint,
    textAlign: "center",
    marginTop: -space.sm,
    marginBottom: space.lg,
  },
});
