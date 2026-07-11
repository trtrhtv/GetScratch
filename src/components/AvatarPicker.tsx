import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, font, radius, space } from "@/theme/tokens";
import { AVATAR_PRESETS, type AvatarPresetId } from "@/utils/avatarPresets";

// גריד בחירת אווטאר באונבורדינג — אריחי צבע שטוחים מהסט הקבוע, לא תמונות.
export default function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarPresetId | null;
  onChange: (id: AvatarPresetId) => void;
}) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {AVATAR_PRESETS.map((preset) => {
        const active = preset.id === value;
        return (
          <Pressable
            key={preset.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(preset.id)}
            style={[
              styles.tile,
              { backgroundColor: preset.background },
              active && styles.tileActive,
            ]}
          >
            {active ? <Text style={[styles.check, { color: preset.foreground }]}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const TILE_SIZE = 64;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.md,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  tileActive: {
    borderColor: color.ink,
  },
  check: {
    fontFamily: font.bodyBold,
    fontSize: 22,
  },
});
