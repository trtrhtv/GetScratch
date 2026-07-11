import { StyleSheet, Text, View } from "react-native";
import { font, radius } from "@/theme/tokens";
import { getAvatarPreset, initialsFromName } from "@/utils/avatarPresets";

const SIZE_MAP = { sm: 32, md: 44, lg: 64 } as const;

export default function Avatar({
  name,
  avatarId,
  size = "md",
}: {
  name: string;
  avatarId: string;
  size?: keyof typeof SIZE_MAP;
}) {
  const preset = getAvatarPreset(avatarId);
  const dimension = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius.full,
          backgroundColor: preset.background,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { color: preset.foreground, fontSize: dimension * 0.38 },
        ]}
      >
        {initialsFromName(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: font.bodySemiBold,
  },
});
