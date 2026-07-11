import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import RatingStars from "@/components/RatingStars";
import { color, font, fontSize, radius, space } from "@/theme/tokens";
import backend from "@/backend/mock";
import { MOCK_MY_LOCATION } from "@/utils/geo";
import type { RaterRole } from "@/backend/types";

export default function RateOrderScreen() {
  const { t } = useTranslation();
  const { orderId, rateeId, raterRole } = useLocalSearchParams<{
    orderId: string;
    rateeId: string;
    raterRole: RaterRole;
  }>();

  const [rateeName, setRateeName] = useState("");
  const [stars, setStars] = useState(5);
  const [tag, setTag] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    backend.presence
      .listNearby(MOCK_MY_LOCATION)
      .then((list) => setRateeName(list.find((s) => s.id === rateeId)?.name ?? ""));
  }, [rateeId]);

  const tags = t(raterRole === "scratcher" ? "rating.tagsAsScratcher" : "rating.tagsAsCustomer", {
    returnObjects: true,
  }) as string[];

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    try {
      await backend.ratings.submit({
        orderId,
        rateeId,
        raterRole,
        stars,
        ...(tag ? { tag } : {}),
      });
      router.replace("/home");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{t("rating.title", { name: rateeName })}</Text>
        <Text style={styles.subtitle}>{t("rating.subtitle")}</Text>

        <View style={styles.starsWrap}>
          <RatingStars value={stars} onChange={setStars} interactive size={36} />
        </View>

        <View style={styles.tagRow}>
          {tags.map((option) => {
            const active = tag === option;
            return (
              <Pressable
                key={option}
                onPress={() => setTag(active ? null : option)}
                style={[styles.tag, active && styles.tagActive]}
              >
                <Text style={[styles.tagLabel, active && styles.tagLabelActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button label={t("rating.submit")} onPress={handleSubmit} loading={submitting} style={styles.submit} />
        <Button
          label={t("rating.skip")}
          onPress={() => router.replace("/home")}
          variant="ghost"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    gap: space.md,
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
    marginBottom: space.md,
  },
  starsWrap: {
    alignItems: "center",
    marginBottom: space.lg,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.sm,
    marginBottom: space.xl,
  },
  tag: {
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.full,
    paddingStart: space.md,
    paddingEnd: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    backgroundColor: color.surface,
  },
  tagActive: {
    backgroundColor: color.slate,
    borderColor: color.slate,
  },
  tagLabel: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.label,
    color: color.inkMuted,
  },
  tagLabelActive: {
    color: color.white,
  },
  submit: {
    marginBottom: space.sm,
  },
});
