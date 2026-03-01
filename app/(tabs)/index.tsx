import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Wand2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { generateStory } from "@/services/openai";
import { useStories } from "@/contexts/StoryContext";
import { COLORS } from "@/constants/colors";
import { Story } from "@/types/story";

const SUGGESTIONS_EN = [
  { emoji: "🐉", text: "A brave knight and a friendly dragon" },
  { emoji: "🌀", text: "A curious girl who finds a magic portal" },
  { emoji: "🤝", text: "Two friends who learn to share" },
  { emoji: "🧙", text: "A wizard who teaches kindness" },
];

const SUGGESTIONS_ES = [
  { emoji: "🐉", text: "Un caballero valiente y un dragón amigable" },
  { emoji: "🌀", text: "Una niña curiosa que encuentra un portal mágico" },
  { emoji: "🤝", text: "Dos amigos que aprenden a compartir" },
  { emoji: "🧙", text: "Un mago que enseña la bondad" },
];

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const { addStory } = useStories();

  const generateStoryMutation = useMutation({
    mutationFn: async () => {
      const lines = await generateStory(prompt, language);
      const ambience = (lines as any)?.ambience as string | undefined;
      return { lines, ambience };
    },
    onSuccess: ({ lines, ambience }) => {
      const newStory: Story = {
        id: Date.now().toString(),
        lines,
        prompt,
        language,
        createdAt: Date.now(),
        audioGenerated: false,
        ambience,
      };
      addStory(newStory);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPrompt("");
      router.push(`/player/${newStory.id}` as any);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to generate story";
      Alert.alert("Error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleCreate = () => {
    if (!prompt.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateStoryMutation.mutate();
  };

  const suggestions = language === "en" ? SUGGESTIONS_EN : SUGGESTIONS_ES;
  const isPending = generateStoryMutation.isPending;

  return (
    <View style={styles.container}>
      {/* Full-screen gradient hero */}
      <LinearGradient
        colors={["#5B9EC9", "#7BB8D9", "#D6EDF8", "#F4F9FC"]}
        style={styles.heroBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero wordmark ────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.wordmark}>Snory</Text>
          <Text style={styles.tagline}>
            {language === "en"
              ? "AI stories your kids will love"
              : "Historias mágicas para tus hijos"}
          </Text>

          {/* Language pill toggle */}
          <View style={styles.langRow}>
            {(["en", "es"] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langPill,
                  language === lang && styles.langPillActive,
                ]}
                onPress={() => {
                  setLanguage(lang);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.langText,
                    language === lang && styles.langTextActive,
                  ]}
                >
                  {lang === "en" ? "🇬🇧  English" : "🇪🇸  Español"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Creation card ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            {language === "en"
              ? "What story would you like?"
              : "¿Qué historia te gustaría?"}
          </Text>

          <TextInput
            style={[styles.input, isPending && styles.inputDisabled]}
            placeholder={
              language === "en"
                ? "Describe your story idea…"
                : "Describe tu idea de historia…"
            }
            placeholderTextColor={COLORS.textTertiary}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            editable={!isPending}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.cta,
              (!prompt.trim() || isPending) && styles.ctaDisabled,
            ]}
            onPress={handleCreate}
            disabled={!prompt.trim() || isPending}
            activeOpacity={0.82}
          >
            <LinearGradient
              colors={
                !prompt.trim() || isPending
                  ? [COLORS.textTertiary, COLORS.textTertiary]
                  : [COLORS.primary, COLORS.primaryDark]
              }
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isPending ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.ctaText}>
                    {language === "en" ? "Creating magic…" : "Creando magia…"}
                  </Text>
                </>
              ) : (
                <>
                  <Wand2 size={20} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.ctaText}>
                    {language === "en" ? "Create Story" : "Crear Historia"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Suggestions ─────────────────────────────────────── */}
          <Text style={styles.suggestLabel}>
            {language === "en" ? "Need inspiration?" : "¿Necesitas ideas?"}
          </Text>

          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.chip}
                onPress={() => {
                  setPrompt(s.text);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.chipEmoji}>{s.emoji}</Text>
                <Text style={styles.chipText}>{s.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  scroll: {
    paddingBottom: 48,
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingTop: 72,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  wordmark: {
    fontSize: 64,
    fontWeight: "900" as const,
    color: COLORS.cream,
    letterSpacing: -2,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.cream,
    opacity: 0.88,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500" as const,
  },
  langRow: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    padding: 4,
  },
  langPill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  langPillActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  langText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.cream,
    opacity: 0.85,
  },
  langTextActive: {
    color: COLORS.primary,
    opacity: 1,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: COLORS.text,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
  },
  inputDisabled: {
    opacity: 0.5,
  },

  // ── CTA ───────────────────────────────────────────────────────────────────
  cta: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Suggestions ───────────────────────────────────────────────────────────
  suggestLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: COLORS.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  suggestions: {
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryPale,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: COLORS.text,
    flex: 1,
  },
});
