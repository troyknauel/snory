import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Info, Globe, Shield, Mail, Volume2, Music2, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { COLORS } from "@/constants/colors";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { VolumeSlider } from "@/components/VolumeSlider";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen() {
  const {
    musicEnabled,
    musicVolume,
    voiceVolume,
    setMusicEnabled,
    setMusicVolume,
    setVoiceVolume,
  } = useAudioSettings();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight, COLORS.background]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
      >
        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Audio ─────────────────────────────────────────────────── */}
        <SectionHeader title="Audio" />
        <View style={styles.card}>
          {/* Voice volume */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Volume2 size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Voice</Text>
              <View style={styles.sliderWrap}>
                <VolumeSlider
                  label=""
                  value={voiceVolume}
                  onChange={setVoiceVolume}
                  testID="settings_voice_volume"
                />
              </View>
            </View>
          </View>

          <Divider />

          {/* Atmosphere toggle */}
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Music2
                size={18}
                color={musicEnabled ? COLORS.primary : COLORS.textTertiary}
                strokeWidth={2}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Atmosphere</Text>
              <Text style={styles.rowSub}>
                Ambient background sounds
              </Text>
            </View>
            <Switch
              value={musicEnabled}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMusicEnabled(v);
              }}
              trackColor={{
                false: COLORS.borderLight,
                true: `${COLORS.primary}60`,
              }}
              thumbColor={musicEnabled ? COLORS.primary : COLORS.textTertiary}
              testID="settings_music_toggle"
            />
          </View>

          {musicEnabled && (
            <>
              <Divider />
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Music2 size={18} color={COLORS.primary} strokeWidth={2} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Atmosphere Volume</Text>
                  <View style={styles.sliderWrap}>
                    <VolumeSlider
                      label=""
                      value={musicVolume}
                      onChange={setMusicVolume}
                      testID="settings_music_volume"
                    />
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── About ─────────────────────────────────────────────────── */}
        <SectionHeader title="About" />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Info size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowSub}>
                {Constants.expoConfig?.version ?? "1.0.0"}
              </Text>
            </View>
          </View>
          <Divider />
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Globe size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Languages</Text>
              <Text style={styles.rowSub}>English, Español</Text>
            </View>
          </View>
        </View>

        {/* ── Privacy ───────────────────────────────────────────────── */}
        <SectionHeader title="Privacy" />
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Shield size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Your Data</Text>
              <Text style={styles.rowSub}>
                Stories are stored only on your device. No personal data is collected or shared.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Support ───────────────────────────────────────────────── */}
        <SectionHeader title="Support" />
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Linking.openURL("mailto:support@snory.app");
          }}
          activeOpacity={0.7}
        >
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Mail size={18} color={COLORS.primary} strokeWidth={2} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Contact Us</Text>
              <Text style={styles.rowSub}>support@snory.app</Text>
            </View>
            <ChevronRight size={16} color={COLORS.textTertiary} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ✨ for young storytellers
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800" as const,
    color: COLORS.cream,
    letterSpacing: -0.5,
  },

  scroll: {
    padding: 16,
    paddingBottom: 48,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: COLORS.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: COLORS.text,
  },
  rowSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  sliderWrap: {
    marginTop: 10,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 16,
  },

  footer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
});
