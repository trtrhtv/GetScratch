import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import Banner from "@/components/Banner";
import RadarPulse from "@/components/RadarPulse";
import { color, font, fontSize, space } from "@/theme/tokens";
import backend from "@/backend/mock";
import { MOCK_MY_LOCATION } from "@/utils/geo";
import type { Order, ScratcherProfile } from "@/backend/types";

// פולינג קליל כרשת-ביטחון לצד ה-subscribe: מרענן את מצב ההזמנה כל 3 שניות,
// כך שמסך ההמתנה מתעדכן תוך זמן קצר גם אם התראת ה-push המדומה מתעכבת.
const POLL_INTERVAL_MS = 3000;

export default function WaitingScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ orderId: string; scratcherId: string }>();

  const [currentOrderId, setCurrentOrderId] = useState(params.orderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [scratcher, setScratcher] = useState<ScratcherProfile | null>(null);
  const [retrying, setRetrying] = useState(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    backend.presence.listNearby(MOCK_MY_LOCATION).then((list) => {
      setScratcher(list.find((s) => s.id === params.scratcherId) ?? null);
    });
  }, [params.scratcherId]);

  const applyUpdate = useCallback(
    (updated: Order | null) => {
      if (!updated) return;
      setOrder(updated);
      if (updated.status === "accepted" && !navigatedRef.current) {
        navigatedRef.current = true;
        router.replace({
          pathname: "/order/active",
          params: { orderId: updated.id, scratcherId: params.scratcherId },
        });
      }
    },
    [params.scratcherId]
  );

  useEffect(() => {
    navigatedRef.current = false;
    let cancelled = false;
    backend.orders.getById(currentOrderId).then((o) => {
      if (!cancelled) applyUpdate(o);
    });
    const unsubscribe = backend.orders.subscribeOrder(currentOrderId, applyUpdate);
    const poll = setInterval(() => {
      backend.orders.getById(currentOrderId).then((o) => {
        if (!cancelled) applyUpdate(o);
      });
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
      unsubscribe();
    };
  }, [currentOrderId, applyUpdate]);

  const handleCancel = useCallback(async () => {
    await backend.orders.cancel(currentOrderId);
    router.replace("/home");
  }, [currentOrderId]);

  const handleRaiseAndRetry = useCallback(async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const next = await backend.orders.create({
        scratcherId: order.scratcherId,
        zone: order.zone,
        intensity: order.intensity,
        durationMinutes: order.durationMinutes,
        price: order.price + 5,
      });
      setCurrentOrderId(next.id);
    } finally {
      setRetrying(false);
    }
  }, [order]);

  const declined = order?.status === "declined";

  return (
    <ScreenContainer>
      <View style={styles.body}>
        {!declined && <RadarPulse />}
        <Text style={styles.title}>{t("order.waiting.title")}</Text>
        {scratcher && (
          <Text style={styles.subtitle}>
            {t("order.waiting.subtitle", { name: scratcher.name })}
          </Text>
        )}
        {declined && (
          <View style={styles.declinedBlock}>
            <Banner text={t("order.waiting.declinedNotice")} tone="danger" />
            <Button
              label={t("order.waiting.raiseAndRetry")}
              onPress={handleRaiseAndRetry}
              loading={retrying}
              style={styles.retryButton}
            />
          </View>
        )}
      </View>
      <Button
        label={t("order.waiting.cancel")}
        onPress={handleCancel}
        variant="secondary"
        style={styles.cancel}
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
    fontSize: fontSize.title,
    color: color.ink,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
    textAlign: "center",
  },
  declinedBlock: {
    width: "100%",
    gap: space.md,
    marginTop: space.lg,
  },
  retryButton: {},
  cancel: {
    marginBottom: space.lg,
  },
});
