import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Avatar from "./Avatar";
import { color, radius } from "@/theme/tokens";
import type { ScratcherProfile } from "@/backend/types";
import { MOCK_MY_LOCATION } from "@/utils/geo";

export default function NearbyPanel({
  scratchers,
  selectedId,
  onSelect,
}: {
  scratchers: ScratcherProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const initialRegion = useMemo(
    () => ({
      latitude: MOCK_MY_LOCATION.lat,
      longitude: MOCK_MY_LOCATION.lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    }),
    []
  );

  return (
    <MapView style={styles.map} initialRegion={initialRegion}>
      {scratchers.map((s) => (
        <Marker
          key={s.id}
          coordinate={{ latitude: s.location.lat, longitude: s.location.lng }}
          onPress={() => onSelect(s.id)}
        >
          <View style={[styles.pin, s.id === selectedId && styles.pinSelected]}>
            <Avatar name={s.name} avatarId={s.avatarId} size="sm" />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    borderRadius: radius.lg,
  },
  pin: {
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: color.surface,
  },
  pinSelected: {
    borderColor: color.slate,
  },
});
