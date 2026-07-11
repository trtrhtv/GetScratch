import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { color, font, fontSize, lineHeight, radius, space } from "@/theme/tokens";

export type BannerTone = "neutral" | "info" | "success" | "danger";

const TONE_STYLES: Record<BannerTone, { background: string; text: string }> = {
  neutral: { background: color.surface, text: color.inkMuted },
  info: { background: color.slateSoft, text: color.slate },
  success: { background: color.sageSoft, text: color.sage },
  danger: { background: color.brickSoft, text: color.brick },
};

// הודעת סטטוס/empty-state בקול המערכת — תמיד עם משפט מכוון-פעולה, לא איור עצוב.
export default function Banner({
  text,
  tone = "neutral",
  action,
}: {
  text: string;
  tone?: BannerTone;
  action?: ReactNode;
}) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <View style={[styles.container, { backgroundColor: toneStyle.background }]}>
      <Text style={[styles.text, { color: toneStyle.text }]}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  text: {
    fontFamily: font.bodyRegular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    textAlign: "auto",
  },
});
