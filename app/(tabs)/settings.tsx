import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Info, Globe, Shield, Mail, Volume2, Music2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { COLORS } from "@/constants/colors";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { VolumeSlider } from "@/components/VolumeSlider";

export default function SettingsScreen() {
  const { musicEnabled, musicVolume, voiceVolume, setMusicEnabled, setMusicVolume, setVoiceVolume } = useAudioSettings();

  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("mailto:support@snory.app");
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.white]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Volume2 size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Voice Volume</Text>
                <VolumeSlider
                  label=""
                  value={voiceVolume}
                  onChange={(v) => {
                    setVoiceVolume(v);
                  }}
                  testID="settings_voice_volume"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.musicRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMusicEnabled(!musicEnabled);
              }}
              activeOpacity={0.7}
              testID="settings_music_toggle"
            >
              <Music2 size={20} color={musicEnabled ? COLORS.primary : COLORS.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Atmosphere</Text>
                <Text style={styles.infoValue}>
                  {musicEnabled ? "On" : "Off"}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Music2 size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Atmosphere Volume</Text>
                <VolumeSlider
                  label=""
                  value={musicVolume}
                  onChange={(v) => {
                    setMusicVolume(v);
                  }}
                  testID="settings_music_volume"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Info size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>App Version</Text>
                <Text style={styles.infoValue}>{Constants.expoConfig?.version || "1.0.0"}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Globe size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Languages</Text>
                <Text style={styles.infoValue}>English, Español</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Shield size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Privacy & Data</Text>
                <Text style={styles.infoDescription}>
                  Your stories are stored locally on your device. We don&apos;t collect or share any personal data.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={handleEmailPress}
            activeOpacity={0.7}
          >
            <View style={styles.infoRow}>
              <Mail size={20} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Us</Text>
                <Text style={styles.infoValue}>support@snory.app</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ✨ for young storytellers</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  header: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: COLORS.white,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.textLight,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.text,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  infoDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  footer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
