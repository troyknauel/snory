import React, { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  testID?: string;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const VolumeSlider = React.memo(function VolumeSlider({
  label,
  value,
  onChange,
  testID,
}: VolumeSliderProps) {
  const trackWidthRef = useRef<number>(1);

  const percent = useMemo(() => clamp01(value), [value]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const w = trackWidthRef.current;
          onChange(clamp01(x / w));
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const w = trackWidthRef.current;
          onChange(clamp01(x / w));
        },
      }),
    [onChange]
  );

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueText}>{Math.round(percent * 100)}%</Text>
      </View>

      <View
        style={styles.track}
        onLayout={(e) => {
          trackWidthRef.current = Math.max(1, e.nativeEvent.layout.width);
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${percent * 100}%` }]} />
        <View style={[styles.thumb, { left: `${percent * 100}%` }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#2C3E50",
  },
  valueText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#546E7A",
  },
  track: {
    height: 14,
    borderRadius: 999,
    backgroundColor: "#EEF2F7",
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#6BA3C0",
  },
  thumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#6BA3C0",
    marginLeft: -9,
  },
});
