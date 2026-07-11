import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import { color, font, fontSize, space } from "@/theme/tokens";
import backend from "@/backend/mock";
import { MOCK_MY_LOCATION } from "@/utils/geo";
import type { Order, ScratcherProfile } from "@/backend/types";
import { ZONE_LABEL_KEYS, INTENSITY_LABEL_KEYS } from "@/utils/specialtyLabels";

const TIMEOUT_SECONDS = 30;
const DEFAULT_ETA_MINUTES = 5;

export default function IncomingRequestModal() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<ScratcherProfile | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const [responding, setResponding] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    backend.orders.getById(orderId).then((o) => {
      setOrder(o);
      if (o) {
        backend.presence
          .listNearby(MOCK_MY_LOCATION)
          .then((list) => setCustomer(list.find((s) => s.id === o.customerId) ?? null));
      }
    });
  }, [orderId]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        backend.orders.respond(orderId, { accept: false }).finally(() => router.back());
      }
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, orderId]);

  async function handleDecide(accept: boolean): Promise<void> {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setResponding(true);
    try {
      await backend.orders.respond(orderId, {
        accept,
        etaMinutes: accept ? DEFAULT_ETA_MINUTES : undefined,
      });
      if (accept) {
        router.replace({ pathname: "/order/active", params: { orderId } });
      } else {
        router.back();
      }
    } finally {
      setResponding(false);
    }
  }

  if (!order) return null;

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{t("order.incoming.title")}</Text>
        <Text style={styles.timer}>{t("order.incoming.timeoutNotice", { seconds: secondsLeft })}</Text>

        <Card style={styles.card}>
          {customer && (
            <View style={styles.customerRow}>
              <Avatar name={customer.name} avatarId={customer.avatarId} size="md" />
              <Text style={styles.customerName}>{t("order.incoming.from", { name: customer.name })}</Text>
            </View>
          )}
          <Text style={styles.detail}>{t("order.incoming.zone", { zone: t(ZONE_LABEL_KEYS[order.zone]) })}</Text>
          <Text style={styles.detail}>
            {t("order.incoming.intensity", { intensity: t(INTENSITY_LABEL_KEYS[order.intensity]) })}
          </Text>
          <Text style={styles.detail}>
            {t("order.incoming.duration", {
              duration: t(`order.create.duration.${order.durationMinutes === 2 ? "two" : order.durationMinutes === 5 ? "five" : "ten"}`),
            })}
          </Text>
          <Text style={styles.price}>
            {t("order.incoming.price", { price: `${t("common.currencySymbol")}${order.price}` })}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            label={t("order.incoming.decline")}
            onPress={() => handleDecide(false)}
            variant="secondary"
            disabled={responding}
            style={styles.actionButton}
          />
          <Button
            label={t("order.incoming.accept")}
            onPress={() => handleDecide(true)}
            loading={responding}
            style={styles.actionButton}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    gap: space.lg,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    textAlign: "center",
  },
  timer: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.label,
    color: color.brick,
    textAlign: "center",
  },
  card: {
    gap: space.sm,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.sm,
  },
  customerName: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
  },
  detail: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkMuted,
  },
  price: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
    marginTop: space.xs,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
  },
  actionButton: {
    flex: 1,
  },
});
