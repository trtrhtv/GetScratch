import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useLocalSearchParams } from "expo-router";
import ScreenContainer from "@/components/ScreenContainer";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import ChatThread from "@/components/ChatThread";
import LoadingView from "@/components/LoadingView";
import { color, font, fontSize, space } from "@/theme/tokens";
import { useAppStore } from "@/store/useAppStore";
import backend from "@/backend/mock";
import { MOCK_MY_LOCATION } from "@/utils/geo";
import { mockPhoneForId } from "@/utils/mockPhone";
import { ZONE_LABEL_KEYS, INTENSITY_LABEL_KEYS } from "@/utils/specialtyLabels";
import type { ChatMessage, Order, ScratcherProfile } from "@/backend/types";

const DURATION_KEY: Record<number, "two" | "five" | "ten"> = { 2: "two", 5: "five", 10: "ten" };

export default function ActiveOrderScreen() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const myUserId = useAppStore((s) => s.user?.id ?? "");

  const [order, setOrder] = useState<Order | null>(null);
  const [counterparty, setCounterparty] = useState<ScratcherProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    backend.orders.getById(orderId).then(setOrder);
    const unsubscribe = backend.orders.subscribeOrder(orderId, setOrder);
    return unsubscribe;
  }, [orderId]);

  useEffect(() => {
    backend.chat.list(orderId).then(setMessages);
    const unsubscribe = backend.chat.subscribe(orderId, setMessages);
    return unsubscribe;
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const counterpartyId = order.customerId === myUserId ? order.scratcherId : order.customerId;
    backend.presence
      .listNearby(MOCK_MY_LOCATION)
      .then((list) => setCounterparty(list.find((s) => s.id === counterpartyId) ?? null));
  }, [order, myUserId]);

  if (!order) return <LoadingView />;

  const iAmScratcher = order.scratcherId === myUserId;
  const statusKey = iAmScratcher ? "order.active.statusInProgressAsScratcher" : "order.active.statusInProgress";
  const counterpartyPhone = counterparty ? mockPhoneForId(counterparty.id) : null;

  async function handleComplete(): Promise<void> {
    setCompleting(true);
    try {
      await backend.orders.markComplete(orderId);
      router.replace({
        pathname: "/order/rate",
        params: {
          orderId,
          rateeId: order!.customerId === myUserId ? order!.scratcherId : order!.customerId,
          raterRole: iAmScratcher ? "scratcher" : "customer",
        },
      });
    } finally {
      setCompleting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{t("order.active.title")}</Text>

        <Card style={styles.statusCard}>
          {counterparty && (
            <View style={styles.counterpartyRow}>
              <Avatar name={counterparty.name} avatarId={counterparty.avatarId} size="md" />
              <View>
                <Text style={styles.counterpartyName}>{counterparty.name}</Text>
                <Text style={styles.status}>{t(order.status === "accepted" ? "order.active.statusAccepted" : statusKey)}</Text>
              </View>
            </View>
          )}
          {order.etaMinutes !== undefined && (
            <Text style={styles.eta}>
              {t("order.active.eta", { minutes: order.etaMinutes, unit: t("common.minutesShort") })}
            </Text>
          )}
          <Text style={styles.summary}>
            {t("order.active.orderSummary", {
              zone: t(ZONE_LABEL_KEYS[order.zone]),
              intensity: t(INTENSITY_LABEL_KEYS[order.intensity]),
              duration: t(`order.create.duration.${DURATION_KEY[order.durationMinutes]}`),
              price: `${t("common.currencySymbol")}${order.price}`,
            })}
          </Text>

          {counterpartyPhone && (
            <View style={styles.phoneBlock}>
              <Text style={styles.phoneNotice}>{t("order.active.phoneRevealNotice")}</Text>
              <Button
                label={`${t("order.active.call")} · ${counterpartyPhone}`}
                onPress={() => Linking.openURL(`tel:${counterpartyPhone}`)}
                variant="secondary"
              />
            </View>
          )}
        </Card>

        <View style={styles.chatWrap}>
          <ChatThread
            messages={messages}
            myUserId={myUserId}
            onSend={(text) => backend.chat.send(orderId, text)}
          />
        </View>
      </View>

      <Button
        label={t("order.active.complete")}
        onPress={handleComplete}
        loading={completing}
        style={styles.completeButton}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.title,
    color: color.ink,
    textAlign: "center",
    marginTop: space.md,
    marginBottom: space.md,
  },
  statusCard: {
    marginBottom: space.md,
    gap: space.sm,
  },
  counterpartyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  counterpartyName: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.bodyLarge,
    color: color.ink,
  },
  status: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.label,
    color: color.slate,
    marginTop: 2,
  },
  eta: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.body,
    color: color.ink,
  },
  summary: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.label,
    color: color.inkMuted,
  },
  phoneBlock: {
    gap: space.sm,
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
  },
  phoneNotice: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkFaint,
  },
  chatWrap: {
    flex: 1,
  },
  completeButton: {
    marginTop: space.md,
    marginBottom: space.lg,
  },
});
