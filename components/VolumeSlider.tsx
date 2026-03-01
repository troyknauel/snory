import React, { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/colors";

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export const VolumeSlider = React.memo(function VolumeSlider({
  label,
  value,
  onChange,
  testID,
}: VolumeSliderProps) {
  const trackWidthRef = useRef<number>(1);
  const pct = useMemo(() => clamp(value), [value]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) =>
          onChange(clamp(evt.nativeEvent.locationX / trackWidthRef.current)),
        onPanResponderMove: (evt) =>
          onChange(clamp(evt.nativeEvent.locationX / trackWidthRef.current)),
      }),
    [onChange]
  );

  return (
    <View style={styles.container} testID={testID}>
      {label ? (
        <View style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.pctText}>{Math.round(pct * 100)}%</Text>
        </View>
      ) : null}
      <View
        style={styles.track}
        onLayout={(e) => {
          trackWidthRef.current = Math.max(1, e.nativeEvent.layout.width);
        }}
        {...pan.panHandlers}
      >
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        <View
          style={[
            styles.thumb,
            { left: `${pct * 100}%` as any },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.textSecondary,
  },
  pctText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: COLORS.primary,
  },
  track: {
    height: 10,
    borderRadius: 100,
    backgroundColor: COLORS.primaryMuted,
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 100,
    backgroundColor: COLORS.primary,
  },
  thumb: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    marginLeft: -10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
