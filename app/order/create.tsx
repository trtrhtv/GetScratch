import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Banner from "@/components/Banner";
import ContourBackMap from "@/components/ContourBackMap";
import SegmentedControl from "@/components/SegmentedControl";
import PriceStepper from "@/components/PriceStepper";
import { color, font, fontSize, space } from "@/theme/tokens";
import backend from "@/backend/mock";
import { fairPrice } from "@/backend/mock/bots";
import { MOCK_MY_LOCATION } from "@/utils/geo";
import type { BackZone, DurationMinutes, Intensity, ScratcherProfile } from "@/backend/types";

export default function CreateOrderScreen() {
  const { t } = useTranslation();
  const { scratcherId } = useLocalSearchParams<{ scratcherId: string }>();

  const [scratcher, setScratcher] = useState<ScratcherProfile | null>(null);
  const [zone, setZone] = useState<BackZone | null>(null);
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [durationMinutes, setDurationMinutes] = useState<DurationMinutes>(5);
  const [zoneError, setZoneError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  // מחיר ידני של המשתמש (אם נגע בסטפר) — עד אז נגזר תמיד מהתמהיל הנוכחי,
  // בלי setState בתוך effect (חישוב טהור ברינדור).
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const price =
    manualPrice ?? Math.round(fairPrice({ zone: zone ?? "upper", intensity, durationMinutes }));

  useEffect(() => {
    backend.presence.listNearby(MOCK_MY_LOCATION).then((list) => {
      setScratcher(list.find((s) => s.id === scratcherId) ?? null);
    });
  }, [scratcherId]);

  const intensityOptions = [
    { value: "gentle" as const, label: t("order.create.intensity.gentle") },
    { value: "medium" as const, label: t("order.create.intensity.medium") },
    { value: "strong" as const, label: t("order.create.intensity.strong") },
  ];
  const durationOptions = [
    { value: "2" as const, label: t("order.create.duration.two") },
    { value: "5" as const, label: t("order.create.duration.five") },
    { value: "10" as const, label: t("order.create.duration.ten") },
  ];

  async function handleSubmit(): Promise<void> {
    if (!zone) {
      setZoneError(t("order.create.errorZone"));
      return;
    }
    if (!scratcherId) return;
    setSubmitting(true);
    try {
      const order = await backend.orders.create({
        scratcherId,
        zone,
        intensity,
        durationMinutes,
        price,
      });
      router.push({ pathname: "/order/waiting", params: { orderId: order.id, scratcherId } });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t("order.create.title")}</Text>
        {scratcher && (
          <Text style={styles.subtitle}>
            {t("order.create.targetLabel", { name: scratcher.name })}
          </Text>
        )}

        <Text style={styles.sectionLabel}>{t("order.create.zoneLabel")}</Text>
        <ContourBackMap selected={zone} onSelect={(z) => { setZone(z); setZoneError(undefined); }} />
        {zoneError && <Banner text={zoneError} tone="danger" />}

        <Text style={styles.sectionLabel}>{t("order.create.intensityLabel")}</Text>
        <SegmentedControl options={intensityOptions} value={intensity} onChange={setIntensity} />

        <Text style={styles.sectionLabel}>{t("order.create.durationLabel")}</Text>
        <SegmentedControl
          options={durationOptions}
          value={String(durationMinutes) as "2" | "5" | "10"}
          onChange={(v) => setDurationMinutes(Number(v) as DurationMinutes)}
        />

        <Text style={styles.sectionLabel}>{t("order.create.priceLabel")}</Text>
        <View style={styles.priceBlock}>
          <PriceStepper
            price={price}
            onChange={setManualPrice}
          />
        </View>

        <Button
          label={t("order.create.submit")}
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submit}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: space.xxl,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    marginTop: space.md,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
    textAlign: "center",
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  sectionLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.label,
    color: color.inkMuted,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  priceBlock: {
    marginTop: space.sm,
  },
  submit: {
    marginTop: space.xxl,
  },
});
