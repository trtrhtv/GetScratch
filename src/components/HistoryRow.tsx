import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Avatar from "./Avatar";
import { color, font, fontSize, radius, space } from "@/theme/tokens";
import type { Order } from "@/backend/types";

export default function HistoryRow({
  order,
  role,
  counterpartyName,
  counterpartyAvatarId,
}: {
  order: Order;
  role: "customer" | "scratcher";
  counterpartyName: string;
  counterpartyAvatarId: string;
}) {
  const { t } = useTranslation();
  const date = new Date(order.createdAt).toLocaleDateString();

  return (
    <View style={styles.row}>
      <Avatar name={counterpartyName} avatarId={counterpartyAvatarId} size="sm" />
      <View style={styles.info}>
        <Text style={styles.name}>
          {t("history.withLabel", { name: counterpartyName })}
        </Text>
        <Text style={styles.meta}>
          {t(role === "customer" ? "history.roleCustomer" : "history.roleScratcher")} · {date}
        </Text>
      </View>
      <View style={styles.trailing}>
        <Text style={styles.price}>
          {t("common.currencySymbol")}
          {order.price}
        </Text>
        <Text style={styles.status}>
          {t(order.status === "rated" ? "history.statusRated" : "history.statusCompleted")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.hairline,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: font.bodyMedium,
    fontSize: fontSize.body,
    color: color.ink,
  },
  meta: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.inkMuted,
    marginTop: 2,
  },
  trailing: {
    alignItems: "flex-end",
  },
  price: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.body,
    color: color.ink,
  },
  status: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.caption,
    color: color.sage,
    marginTop: 2,
    borderRadius: radius.full,
  },
});
