import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { color, font, fontSize, lineHeight, radius, space } from "@/theme/tokens";
import type { ChatMessage } from "@/backend/types";

export default function ChatThread({
  messages,
  myUserId,
  onSend,
}: {
  messages: ChatMessage[];
  myUserId: string;
  onSend: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  function handleSend(): void {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {messages.length === 0 ? (
          <Text style={styles.empty}>{t("order.chat.empty")}</Text>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myUserId;
            return (
              <View
                key={m.id}
                style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
              >
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.text}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("order.chat.placeholder")}
          placeholderTextColor={color.inkFaint}
          style={styles.input}
          onSubmitEditing={handleSend}
        />
        <Button label={t("order.chat.send")} onPress={handleSend} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: space.sm,
    paddingBottom: space.md,
  },
  empty: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.inkFaint,
    textAlign: "center",
    marginTop: space.xl,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: radius.lg,
    paddingStart: space.md,
    paddingEnd: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  bubbleMine: {
    backgroundColor: color.slate,
  },
  bubbleTheirs: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  bubbleText: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    color: color.ink,
  },
  bubbleTextMine: {
    color: color.white,
  },
  inputRow: {
    flexDirection: "row",
    gap: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.hairline,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    paddingStart: space.md,
    paddingEnd: space.md,
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    color: color.ink,
    textAlign: "auto",
  },
});
