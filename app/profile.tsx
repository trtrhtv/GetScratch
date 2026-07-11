import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import BackButton from "@/components/BackButton";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import RatingStars from "@/components/RatingStars";
import SegmentedControl from "@/components/SegmentedControl";
import HistoryRow from "@/components/HistoryRow";
import Banner from "@/components/Banner";
import { color, font, fontSize, space } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";
import backend from "@/backend/mock";
import { MOCK_MY_LOCATION } from "@/utils/geo";
import i18n, { type SupportedLanguage } from "@/i18n";
import { applyLanguage } from "@/i18n/languageSwitch";
import type { Order, ScratcherProfile } from "@/backend/types";

interface HistoryEntry {
  order: Order;
  role: "customer" | "scratcher";
  counterparty: ScratcherProfile | undefined;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [language, setLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) ?? "he"
  );

  useEffect(() => {
    if (!user) return;
    Promise.all([backend.orders.listHistory(), backend.presence.listNearby(MOCK_MY_LOCATION)]).then(
      ([orders, nearby]) => {
        const finished = orders.filter((o) => o.status === "completed" || o.status === "rated");
        setHistory(
          finished.map((order) => ({
            order,
            role: order.customerId === user.id ? "customer" : "scratcher",
            counterparty: nearby.find(
              (s) => s.id === (order.customerId === user.id ? order.scratcherId : order.customerId)
            ),
          }))
        );
      }
    );
  }, [user]);

  if (!user) return null;

  const languageOptions = [
    { value: "he" as const, label: t("profile.languageHe") },
    { value: "en" as const, label: t("profile.languageEn") },
  ];

  return (
    <ScreenContainer>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t("profile.title")}</Text>

        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <Avatar name={user.name} avatarId={user.avatarId} size="lg" />
            <View>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.phone}>{user.phone}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionLabel}>{t("profile.ratingsTitle")}</Text>
        <Card style={styles.card}>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{t("profile.asCustomer")}</Text>
            {user.ratings.asCustomer.count > 0 ? (
              <View style={styles.ratingValue}>
                <RatingStars value={Math.round(user.ratings.asCustomer.average)} size={16} />
                <Text style={styles.ratingCount}>({user.ratings.asCustomer.count})</Text>
              </View>
            ) : (
              <Text style={styles.noRatings}>{t("profile.noRatingsYet")}</Text>
            )}
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{t("profile.asScratcher")}</Text>
            {user.ratings.asScratcher.count > 0 ? (
              <View style={styles.ratingValue}>
                <RatingStars value={Math.round(user.ratings.asScratcher.average)} size={16} />
                <Text style={styles.ratingCount}>({user.ratings.asScratcher.count})</Text>
              </View>
            ) : (
              <Text style={styles.noRatings}>{t("profile.noRatingsYet")}</Text>
            )}
          </View>
        </Card>

        <Text style={styles.sectionLabel}>{t("profile.historyTitle")}</Text>
        <Card style={styles.card}>
          {history.length === 0 ? (
            <Banner text={t("profile.emptyHistory")} />
          ) : (
            history.map((entry) => (
              <HistoryRow
                key={entry.order.id}
                order={entry.order}
                role={entry.role}
                counterpartyName={entry.counterparty?.name ?? ""}
                counterpartyAvatarId={entry.counterparty?.avatarId ?? "a1"}
              />
            ))
          )}
        </Card>

        <Text style={styles.sectionLabel}>{t("profile.languageTitle")}</Text>
        <SegmentedControl
          options={languageOptions}
          value={language}
          onChange={(lang) => {
            setLanguage(lang);
            applyLanguage(lang);
          }}
        />

        <Text
          style={styles.termsLink}
          onPress={() => router.push("/onboarding/terms")}
        >
          {t("profile.termsLink")}
        </Text>
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
    marginBottom: space.lg,
    textAlign: "center",
  },
  card: {
    marginBottom: space.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  name: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
  },
  phone: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.label,
    color: color.inkMuted,
    marginBottom: space.sm,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.xs,
  },
  ratingLabel: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.ink,
  },
  ratingValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  ratingCount: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkMuted,
  },
  noRatings: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkFaint,
  },
  termsLink: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.label,
    color: color.slate,
    textAlign: "center",
    marginTop: space.xl,
    textDecorationLine: "underline",
  },
});
