import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  X, Play, Pause, RotateCcw, Volume2, Heart, Music, VolumeX,
} from "lucide-react-native";
import { VolumeSlider } from "@/components/VolumeSlider";
import * as Haptics from "expo-haptics";

import { useStories } from "@/contexts/StoryContext";
import {
  generateTTS,
  resetVoiceCache,
  assignVoicesToCharacters,
  ELEVENLABS_QUOTA_ERROR_PREFIX,
} from "@/services/elevenlabs";
import { generateOpenAITTS } from "@/services/openai";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { COLORS } from "@/constants/colors";
import { AudioLine } from "@/types/story";

// ── Character display maps ────────────────────────────────────────────────────
const SPEAKER_COLORS: Record<string, string> = {
  ...COLORS.characters,
};

const SPEAKER_EMOJIS: Record<string, string> = {
  narrator: "📖", girl: "👧", boy: "👦", dragon: "🐉",
  wizard: "🧙", moral: "💡", old_man: "👴", old_woman: "👵",
  woman: "👩", man: "👨", monster: "👹", fairy: "🧚",
  creature: "🐾", default: "✨",
};

const CONTROLS_HEIGHT = 260;
const SWIPE_THRESHOLD = 50;

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStoryById, updateStory, toggleFavorite } = useStories();
  const story = getStoryById(id ?? "");

  const [audioLines, setAudioLines] = useState<AudioLine[]>([]);
  const [audioProgress, setAudioProgress] = useState({ current: 0, total: 0 });
  const [controlsVisible, setControlsVisible] = useState(true);

  const controlsTranslateY = useRef(new Animated.Value(0)).current;
  const panY = useRef(0);

  const {
    currentIndex, isPlaying, backgroundMusicEnabled,
    startPlayback, stopPlayback, pausePlayback, resumePlayback,
    toggleBackgroundMusic, setBackgroundMusicVolume, setVoiceOutputVolume,
    backgroundVolume, voiceVolume,
  } = useAudioPlayer();

  // ── Swipe-to-hide controls ──────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        panY.current = (controlsTranslateY as any)._value;
      },
      onPanResponderMove: (_, g) => {
        const v = panY.current + g.dy;
        if (v >= 0 && v <= CONTROLS_HEIGHT) controlsTranslateY.setValue(v);
      },
      onPanResponderRelease: (_, g) => {
        const hide = g.dy > SWIPE_THRESHOLD || g.vy > 0.5;
        const show = g.dy < -SWIPE_THRESHOLD || g.vy < -0.5;
        if (hide && controlsVisible) hideControls();
        else if (show && !controlsVisible) showControls();
        else if (controlsVisible) showControls();
        else hideControls();
      },
    })
  ).current;

  const showControls = () => {
    setControlsVisible(true);
    Animated.spring(controlsTranslateY, {
      toValue: 0, useNativeDriver: true, tension: 50, friction: 8,
    }).start();
  };
  const hideControls = () => {
    setControlsVisible(false);
    Animated.spring(controlsTranslateY, {
      toValue: CONTROLS_HEIGHT, useNativeDriver: true, tension: 50, friction: 8,
    }).start();
  };

  useEffect(() => {
    if (!story) return;
    setAudioLines(
      story.lines.map((line) => ({
        ...line,
        audioUrl: (line as AudioLine).audioUrl,
      }))
    );
  }, [story]);

  // ── Audio generation ────────────────────────────────────────────────────
  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      if (!story) throw new Error("Story not found");
      resetVoiceCache();
      await assignVoicesToCharacters(story.lines);

      const result: AudioLine[] = [];
      let useFallback = false;
      let alertShown = false;

      for (let i = 0; i < story.lines.length; i++) {
        const line = story.lines[i];
        setAudioProgress({ current: i + 1, total: story.lines.length });
        try {
          if (useFallback) {
            result.push({
              ...line,
              audioUrl: await generateOpenAITTS(line.text, {
                voice: "alloy", format: "mp3",
              }),
            });
            continue;
          }
          result.push({
            ...line,
            audioUrl: await generateTTS(
              line.speaker, line.text, story.language,
              line.characterDescription ?? "", line.characterName ?? ""
            ),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.startsWith(ELEVENLABS_QUOTA_ERROR_PREFIX)) {
            useFallback = true;
            if (!alertShown) {
              alertShown = true;
              Alert.alert(
                story.language === "en" ? "ElevenLabs quota reached" : "Cuota alcanzada",
                story.language === "en"
                  ? "Switching to OpenAI voice."
                  : "Cambiando a voz de OpenAI."
              );
            }
            try {
              result.push({
                ...line,
                audioUrl: await generateOpenAITTS(line.text, {
                  voice: "alloy", format: "mp3",
                }),
              });
              continue;
            } catch {}
          }
          result.push({ ...line, audioUrl: undefined });
        }
      }
      return result;
    },
    onSuccess: (lines) => {
      setAudioLines(lines);
      setAudioProgress({ current: 0, total: 0 });
      if (story) updateStory(story.id, { lines, audioGenerated: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      (async () => {
        try {
          await startPlayback(lines, { ambience: story?.ambience });
        } catch {}
      })();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to generate audio";
      Alert.alert("Error", msg);
      setAudioProgress({ current: 0, total: 0 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handlePlayPause = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isPlaying) { await pausePlayback(); return; }
      if (currentIndex >= 0) { await resumePlayback(); return; }
      await startPlayback(audioLines, { ambience: story?.ambience });
    } catch (e) {
      Alert.alert("Playback error", e instanceof Error ? e.message : "Error");
    }
  };

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopPlayback();
    if (audioLines.every((l) => l.audioUrl))
      startPlayback(audioLines, { ambience: story?.ambience });
  };

  if (!story) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Story not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasAudio = audioLines.every((l) => l.audioUrl);
  const isGenerating = generateAudioMutation.isPending;

  return (
    <View style={styles.container}>
      {/* ── Gradient header strip ─────────────────────────────────── */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight, COLORS.background]}
        style={styles.headerGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
      />

      {/* ── Top bar ───────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => { stopPlayback(); router.back(); }}
        >
          <X size={22} color={COLORS.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {story.prompt}
          </Text>
          <Text style={styles.topMeta}>
            {story.language === "en" ? "English" : "Español"} · {story.lines.length} lines
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.topBtn, story.isFavorite && styles.topBtnActive]}
          onPress={() => {
            if (story) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleFavorite(story.id); }
          }}
        >
          <Heart
            size={20}
            color={story.isFavorite ? COLORS.error : COLORS.textInverse}
            fill={story.isFavorite ? COLORS.error : "none"}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      {/* ── Story scroll ──────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !controlsVisible && styles.scrollExpanded,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {audioLines.map((line, i) => {
          const isActive = currentIndex === i && isPlaying;
          const accent =
            SPEAKER_COLORS[line.speaker] ?? COLORS.characters.default;
          const emoji = SPEAKER_EMOJIS[line.speaker] ?? "✨";

          return (
            <View
              key={i}
              style={[
                styles.lineCard,
                { borderLeftColor: accent },
                isActive && styles.lineCardActive,
              ]}
            >
              {isActive && (
                <View style={[styles.lineGlow, { backgroundColor: `${accent}12` }]} />
              )}
              <View style={styles.speakerRow}>
                <Text style={styles.speakerEmoji}>{emoji}</Text>
                <Text style={[styles.speakerName, isActive && { color: accent }]}>
                  {line.characterName || line.speaker}
                </Text>
                {isActive && (
                  <View style={[styles.playingDot, { backgroundColor: accent }]} />
                )}
              </View>
              <Text style={styles.lineText}>{line.text}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Controls panel ────────────────────────────────────────── */}
      <Animated.View
        style={[styles.controls, { transform: [{ translateY: controlsTranslateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.handle}>
          <View style={styles.handleBar} />
        </View>

        {hasAudio ? (
          <>
            {/* Volume section */}
            <View style={styles.volumeSection}>
              <TouchableOpacity
                style={styles.atmosphereToggle}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleBackgroundMusic(); }}
                activeOpacity={0.7}
                testID="player_music_toggle"
              >
                {backgroundMusicEnabled
                  ? <Music size={16} color={COLORS.primary} strokeWidth={2} />
                  : <VolumeX size={16} color={COLORS.textTertiary} strokeWidth={2} />}
                <Text style={[
                  styles.atmosphereText,
                  !backgroundMusicEnabled && styles.atmosphereTextOff,
                ]}>
                  {story.language === "en" ? "Atmosphere" : "Atmósfera"}
                </Text>
              </TouchableOpacity>

              <View style={styles.sliders}>
                <VolumeSlider
                  label={story.language === "en" ? "Voice" : "Voz"}
                  value={voiceVolume}
                  onChange={setVoiceOutputVolume}
                  testID="player_voice_volume"
                />
                <VolumeSlider
                  label={story.language === "en" ? "Atmosphere" : "Atmósfera"}
                  value={backgroundVolume}
                  onChange={setBackgroundMusicVolume}
                  testID="player_music_volume"
                />
              </View>
            </View>

            {/* Playback controls */}
            <View style={styles.playbackRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRestart}>
                <RotateCcw size={20} color={COLORS.primary} strokeWidth={2} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.playBtn} onPress={handlePlayPause} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.playBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  {isPlaying
                    ? <Pause size={30} color="#FFF" fill="#FFF" />
                    : <Play size={30} color="#FFF" fill="#FFF" />}
                </LinearGradient>
              </TouchableOpacity>

              {/* Spacer to keep play btn centered */}
              <View style={styles.secondaryBtn} />
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              generateAudioMutation.mutate();
            }}
            disabled={isGenerating}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={isGenerating
                ? [COLORS.textTertiary, COLORS.textTertiary]
                : [COLORS.primary, COLORS.primaryDark]}
              style={styles.generateBtnGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.generateBtnText}>
                    {story.language === "en"
                      ? `Generating voices (${audioProgress.current}/${audioProgress.total})`
                      : `Generando voces (${audioProgress.current}/${audioProgress.total})`}
                  </Text>
                </>
              ) : (
                <>
                  <Volume2 size={22} color="#FFF" strokeWidth={2} />
                  <Text style={styles.generateBtnText}>
                    {story.language === "en" ? "Generate Audio" : "Generar Audio"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Peek button when controls hidden */}
      {!controlsVisible && (
        <TouchableOpacity style={styles.peekBtn} onPress={showControls}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.peekBtnGrad}
          >
            <Text style={styles.peekArrow}>⌃</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  headerGrad: {
    position: "absolute", top: 0, left: 0, right: 0, height: 180,
  },

  // ── Top bar ────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  topBtnActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  topCenter: { flex: 1, gap: 2 },
  topTitle: {
    fontSize: 15, fontWeight: "700" as const,
    color: COLORS.textInverse, lineHeight: 20,
  },
  topMeta: {
    fontSize: 12, color: COLORS.textInverse, opacity: 0.75,
  },

  // ── Story lines ────────────────────────────────────────────────────────
  scrollContent: {
    padding: 16, paddingBottom: 300, gap: 10,
  },
  scrollExpanded: { paddingBottom: 40 },

  lineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderLeftWidth: 4,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  lineCardActive: {
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  lineGlow: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18,
  },
  speakerRow: {
    flexDirection: "row", alignItems: "center",
    gap: 8, marginBottom: 8,
  },
  speakerEmoji: { fontSize: 18 },
  speakerName: {
    fontSize: 13, fontWeight: "700" as const,
    color: COLORS.textSecondary, flex: 1,
  },
  playingDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  lineText: {
    fontSize: 16, color: COLORS.text,
    lineHeight: 26, fontWeight: "400" as const,
  },

  // ── Controls panel ─────────────────────────────────────────────────────
  controls: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 20,
  },
  handle: { alignItems: "center", paddingVertical: 10 },
  handleBar: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
  },

  volumeSection: { marginBottom: 16, gap: 14 },
  atmosphereToggle: {
    flexDirection: "row", alignItems: "center", alignSelf: "center",
    gap: 6, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.primaryMuted, borderRadius: 100,
    borderWidth: 1, borderColor: COLORS.primaryPale,
  },
  atmosphereText: {
    fontSize: 13, fontWeight: "600" as const, color: COLORS.primary,
  },
  atmosphereTextOff: { color: COLORS.textTertiary },
  sliders: { gap: 14 },

  playbackRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 28,
  },
  secondaryBtn: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: COLORS.primaryMuted,
    alignItems: "center", justifyContent: "center",
  },
  playBtn: {
    width: 72, height: 72, borderRadius: 36, overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  playBtnGrad: {
    flex: 1, alignItems: "center", justifyContent: "center",
  },

  generateBtn: { borderRadius: 18, overflow: "hidden" },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGrad: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 18, gap: 12,
  },
  generateBtnText: {
    fontSize: 16, fontWeight: "700" as const, color: "#FFF",
  },

  // ── Peek button ────────────────────────────────────────────────────────
  peekBtn: {
    position: "absolute", bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26, overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  peekBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  peekArrow: { fontSize: 24, color: "#FFF", fontWeight: "700" as const },

  // ── Not found ──────────────────────────────────────────────────────────
  notFound: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 40,
    backgroundColor: COLORS.background,
  },
  notFoundText: {
    fontSize: 18, fontWeight: "600" as const, color: COLORS.text, marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 12, paddingHorizontal: 24,
    backgroundColor: COLORS.primary, borderRadius: 14,
  },
  backBtnText: { fontSize: 15, fontWeight: "600" as const, color: "#FFF" },
});
