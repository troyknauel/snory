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
import { X, Play, Pause, RotateCcw, Volume2, Heart, Music, VolumeX } from "lucide-react-native";
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

const SPEAKER_COLORS: Record<string, string> = {
  narrator: COLORS.characters.narrator,
  girl: COLORS.characters.girl,
  boy: COLORS.characters.boy,
  dragon: COLORS.characters.dragon,
  wizard: COLORS.characters.wizard,
  moral: COLORS.characters.moral,
  old_man: "#8B4513",
  old_woman: "#DDA0DD",
  woman: "#FF69B4",
  man: "#4169E1",
  monster: "#8B0000",
  fairy: "#FFB6C1",
  creature: "#CD853F",
  default: COLORS.characters.default,
};

const SPEAKER_EMOJIS: Record<string, string> = {
  narrator: "📖",
  girl: "👧",
  boy: "👦",
  dragon: "🐉",
  wizard: "🧙‍♂️",
  moral: "💡",
  old_man: "👴",
  old_woman: "👵",
  woman: "👩",
  man: "👨",
  monster: "👹",
  fairy: "🧚",
  creature: "🐾",
  default: "✨",
};

const CONTROLS_HEIGHT = 240;
const SWIPE_THRESHOLD = 50;

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getStoryById, updateStory, toggleFavorite } = useStories();
  const story = getStoryById(id || "");

  const [audioLines, setAudioLines] = useState<AudioLine[]>([]);
  const [audioProgress, setAudioProgress] = useState<{ current: number; total: number }>({ 
    current: 0, 
    total: 0 
  });
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  
  const controlsTranslateY = useRef(new Animated.Value(0)).current;
  const panY = useRef(0);

  const { 
    currentIndex, 
    isPlaying, 
    backgroundMusicEnabled,
    startPlayback, 
    stopPlayback, 
    pausePlayback, 
    resumePlayback,
    toggleBackgroundMusic,
    setBackgroundMusicVolume,
    setVoiceOutputVolume,
    backgroundVolume,
    voiceVolume,
  } = useAudioPlayer();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.current = (controlsTranslateY as any)._value;
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = panY.current + gestureState.dy;
        if (newValue >= 0 && newValue <= CONTROLS_HEIGHT) {
          controlsTranslateY.setValue(newValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldHide = gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.5;
        const shouldShow = gestureState.dy < -SWIPE_THRESHOLD || gestureState.vy < -0.5;
        
        if (shouldHide && controlsVisible) {
          hideControls();
        } else if (shouldShow && !controlsVisible) {
          showControls();
        } else if (controlsVisible) {
          showControls();
        } else {
          hideControls();
        }
      },
    })
  ).current;

  const showControls = () => {
    setControlsVisible(true);
    Animated.spring(controlsTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const hideControls = () => {
    setControlsVisible(false);
    Animated.spring(controlsTranslateY, {
      toValue: CONTROLS_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  useEffect(() => {
    if (story && story.audioGenerated) {
      setAudioLines(story.lines.map(line => ({
        ...line,
        audioUrl: (line as AudioLine).audioUrl,
      })));
    } else if (story) {
      setAudioLines(story.lines.map(line => ({ ...line, audioUrl: undefined })));
    }
  }, [story]);

  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      if (!story) throw new Error("Story not found");
      
      console.log("Starting audio generation...");
      resetVoiceCache();
      
      console.log("Assigning voices to characters...");
      await assignVoicesToCharacters(story.lines);
      console.log("Voice assignments complete, generating audio...");

      const generatedAudioLines: AudioLine[] = [];
      let shouldUseOpenAIFallback = false;
      let quotaAlertShown = false;

      for (let i = 0; i < story.lines.length; i++) {
        const line = story.lines[i];
        setAudioProgress({ current: i + 1, total: story.lines.length });

        try {
          if (shouldUseOpenAIFallback) {
            const audioUrl = await generateOpenAITTS(line.text, { voice: "alloy", format: "mp3" });
            generatedAudioLines.push({ ...line, audioUrl });
            continue;
          }

          const audioUrl = await generateTTS(
            line.speaker,
            line.text,
            story.language,
            line.characterDescription || "",
            line.characterName || ""
          );
          generatedAudioLines.push({ ...line, audioUrl });
        } catch (error) {
          console.error(`Error generating audio for line ${i}:`, error);

          const message = error instanceof Error ? error.message : String(error);
          const isQuota = message.startsWith(ELEVENLABS_QUOTA_ERROR_PREFIX);

          if (isQuota) {
            shouldUseOpenAIFallback = true;

            if (!quotaAlertShown) {
              quotaAlertShown = true;
              Alert.alert(
                story.language === "en" ? "ElevenLabs quota reached" : "Cuota de ElevenLabs alcanzada",
                story.language === "en"
                  ? "Switching to OpenAI voice for the rest of this story."
                  : "Cambiando a voz de OpenAI para el resto de esta historia."
              );
            }

            try {
              const audioUrl = await generateOpenAITTS(line.text, { voice: "alloy", format: "mp3" });
              generatedAudioLines.push({ ...line, audioUrl });
              continue;
            } catch (fallbackError) {
              console.error(`[Player] OpenAI TTS fallback failed for line ${i}:`, fallbackError);
            }
          }

          generatedAudioLines.push({ ...line, audioUrl: undefined });
        }
      }

      return generatedAudioLines;
    },
    onSuccess: (generatedAudioLines) => {
      console.log("Audio generated successfully");
      setAudioLines(generatedAudioLines);
      setAudioProgress({ current: 0, total: 0 });
      
      if (story) {
        updateStory(story.id, {
          lines: generatedAudioLines,
          audioGenerated: true,
        });
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      (async () => {
        try {
          await startPlayback(generatedAudioLines, { ambience: story?.ambience });
        } catch (e) {
          console.error("[Player] Auto-start playback failed (user may need to tap Play):", e);
        }
      })();
    },
    onError: (error) => {
      console.error("Error generating audio:", error);
      const message = error instanceof Error ? error.message : "Failed to generate audio";
      Alert.alert("Error", message);
      setAudioProgress({ current: 0, total: 0 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleGenerateAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateAudioMutation.mutate();
  };

  const handlePlayPause = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      if (isPlaying) {
        await pausePlayback();
        return;
      }

      const hasStartedOnce = currentIndex >= 0;
      if (!hasStartedOnce) {
        await startPlayback(audioLines, { ambience: story?.ambience });
        return;
      }

      await resumePlayback();
    } catch (e) {
      console.error("[Player] handlePlayPause error:", e);
      const message = e instanceof Error ? e.message : "Failed to start playback";
      Alert.alert("Playback error", message);
    }
  };

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopPlayback();
    if (audioLines.every(l => l.audioUrl)) {
      startPlayback(audioLines, { ambience: story?.ambience });
    }
  };

  const handleClose = () => {
    stopPlayback();
    router.back();
  };

  const handleToggleFavorite = () => {
    if (story) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleFavorite(story.id);
    }
  };

  const handleToggleBackgroundMusic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBackgroundMusic();
  };

  if (!story) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Story not found</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasAudio = audioLines.every(l => l.audioUrl);
  const isGenerating = generateAudioMutation.isPending;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.white]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={28} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
          <Heart
            size={24}
            color={story.isFavorite ? COLORS.error : COLORS.textLight}
            fill={story.isFavorite ? COLORS.error : "none"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, !controlsVisible && styles.scrollContentExpanded]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.storyHeader}>
          <Text style={styles.storyTitle}>{story.prompt}</Text>
          <Text style={styles.storyMeta}>
            {story.language === "en" ? "English" : "Español"} • {story.lines.length} lines
          </Text>
        </View>

        <View style={styles.storyContent}>
          {audioLines.map((line, index) => (
            <View
              key={index}
              style={[
                styles.storyLine,
                { borderLeftColor: SPEAKER_COLORS[line.speaker] || SPEAKER_COLORS.default },
                currentIndex === index && isPlaying && styles.storyLineActive,
              ]}
            >
              <View style={styles.speakerHeader}>
                <Text style={styles.speakerEmoji}>
                  {SPEAKER_EMOJIS[line.speaker] || SPEAKER_EMOJIS.default}
                </Text>
                <Text style={styles.speakerName}>
                  {line.characterName || line.speaker}
                </Text>
              </View>
              <Text style={styles.storyText}>{line.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Animated.View 
        style={[
          styles.controlsContainer,
          {
            transform: [{ translateY: controlsTranslateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.swipeIndicator}>
          <View style={styles.swipeIndicatorBar} />
        </View>
        {hasAudio ? (
          <>
            <View style={styles.musicControlRow}>
              <TouchableOpacity
                style={styles.musicToggle}
                onPress={handleToggleBackgroundMusic}
                activeOpacity={0.7}
                testID="player_music_toggle"
              >
                {backgroundMusicEnabled ? (
                  <Music size={18} color={COLORS.primary} />
                ) : (
                  <VolumeX size={18} color={COLORS.textLight} />
                )}
                <Text style={[styles.musicToggleText, !backgroundMusicEnabled && styles.musicToggleTextDisabled]}>
                  {story.language === "en" ? "Atmosphere" : "Atmósfera"}
                </Text>
              </TouchableOpacity>

              <View style={styles.volumeSliders}>
                <VolumeSlider
                  label={story.language === "en" ? "Voice" : "Voz"}
                  value={voiceVolume}
                  onChange={(v) => {
                    setVoiceOutputVolume(v);
                  }}
                  testID="player_voice_volume"
                />
                <VolumeSlider
                  label={story.language === "en" ? "Atmosphere" : "Atmósfera"}
                  value={backgroundVolume}
                  onChange={(v) => {
                    setBackgroundMusicVolume(v);
                  }}
                  testID="player_music_volume"
                />
              </View>
            </View>
            
            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleRestart}
                activeOpacity={0.7}
              >
                <RotateCcw size={20} color={COLORS.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePlayPause}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isPlaying ? (
                    <Pause size={32} color={COLORS.white} fill={COLORS.white} />
                  ) : (
                    <Play size={32} color={COLORS.white} fill={COLORS.white} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.secondaryButton} />
            </View>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
            onPress={handleGenerateAudio}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.generateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator color={COLORS.white} size="small" />
                  <Text style={styles.generateButtonText}>
                    {story.language === "en" 
                      ? `Generating voices (${audioProgress.current}/${audioProgress.total})`
                      : `Generando voces (${audioProgress.current}/${audioProgress.total})`}
                  </Text>
                </>
              ) : (
                <>
                  <Volume2 size={24} color={COLORS.white} />
                  <Text style={styles.generateButtonText}>
                    {story.language === "en" ? "Generate Audio" : "Generar Audio"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>

      {!controlsVisible && (
        <TouchableOpacity
          style={styles.showControlsButton}
          onPress={showControls}
          activeOpacity={0.9}
        >
          <View style={styles.showControlsButtonContent}>
            <Text style={styles.showControlsButtonText}>⌃</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  scrollContentExpanded: {
    paddingBottom: 40,
  },
  storyHeader: {
    marginBottom: 24,
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 32,
  },
  storyMeta: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  storyContent: {
    gap: 12,
  },
  storyLine: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  storyLineActive: {
    backgroundColor: COLORS.cream,
    transform: [{ scale: 1.02 }],
  },
  speakerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  speakerEmoji: {
    fontSize: 20,
  },
  speakerName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: COLORS.text,
  },
  storyText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  swipeIndicator: {
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  swipeIndicatorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  showControlsButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  showControlsButtonContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  showControlsButtonText: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: "700" as const,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  primaryButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: COLORS.text,
    marginBottom: 20,
  },
  musicControlRow: {
    marginBottom: 16,
    alignItems: "center",
    gap: 14,
  },
  volumeSliders: {
    width: "100%",
    gap: 14,
    paddingHorizontal: 4,
  },
  musicToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  musicToggleText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.primary,
  },
  musicToggleTextDisabled: {
    color: COLORS.textLight,
  },
});
