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
import { Sparkles, Wand2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { generateStory } from "@/services/openai";
import { useStories } from "@/contexts/StoryContext";
import { COLORS } from "@/constants/colors";
import { Story } from "@/types/story";

export default function HomeScreen() {
  const [prompt, setPrompt] = useState<string>("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const { addStory } = useStories();

  const generateStoryMutation = useMutation({
    mutationFn: async () => {
      console.log("Starting story generation...");
      const lines = await generateStory(prompt, language);
      const ambience = (lines as any)?.ambience as string | undefined;
      return { lines, ambience };
    },
    onSuccess: ({ lines, ambience }) => {
      console.log("Story generated successfully:", { linesCount: lines.length, ambience });
      
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
      console.error("Error generating story:", error);
      const message = error instanceof Error ? error.message : "Failed to generate story";
      Alert.alert("Error", message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleCreateStory = () => {
    if (!prompt.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateStoryMutation.mutate();
  };

  const suggestions = language === "en" ? [
    "A brave knight and a friendly dragon",
    "A curious girl who finds a magic portal",
    "Two friends who learn to share",
    "A wizard teaching kindness",
  ] : [
    "Un caballero valiente y un dragón amigable",
    "Una niña curiosa que encuentra un portal mágico",
    "Dos amigos que aprenden a compartir",
    "Un mago que enseña la bondad",
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight, COLORS.white]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Sparkles size={48} color={COLORS.cream} />
          </View>
          <Text style={styles.title}>Snory</Text>
          <Text style={styles.subtitle}>
            {language === "en" 
              ? "Create magical stories that come to life"
              : "Crea historias mágicas que cobran vida"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.languageToggle}>
            <TouchableOpacity
              style={[styles.languageButton, language === "en" && styles.languageButtonActive]}
              onPress={() => {
                setLanguage("en");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.languageButtonText, language === "en" && styles.languageButtonTextActive]}>
                🇬🇧 English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageButton, language === "es" && styles.languageButtonActive]}
              onPress={() => {
                setLanguage("es");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.languageButtonText, language === "es" && styles.languageButtonTextActive]}>
                🇪🇸 Español
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {language === "en" ? "What story would you like?" : "¿Qué historia te gustaría?"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={language === "en" ? "Tell me about your story idea..." : "Cuéntame tu idea de historia..."}
              placeholderTextColor="#9CA3AF"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.createButton, (!prompt.trim() || generateStoryMutation.isPending) && styles.buttonDisabled]}
            onPress={handleCreateStory}
            disabled={!prompt.trim() || generateStoryMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.createButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {generateStoryMutation.isPending ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.createButtonText}>
                    {language === "en" ? "Creating magic..." : "Creando magia..."}
                  </Text>
                </>
              ) : (
                <>
                  <Wand2 size={20} color="#FFF" />
                  <Text style={styles.createButtonText}>
                    {language === "en" ? "Create Story" : "Crear Historia"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>
              {language === "en" ? "Need inspiration?" : "¿Necesitas inspiración?"}
            </Text>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => {
                  setPrompt(suggestion);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
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
    backgroundColor: COLORS.white,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 56,
    fontWeight: "bold" as const,
    color: COLORS.cream,
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.cream,
    textAlign: "center",
    opacity: 0.95,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  languageToggle: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  languageButtonActive: {
    backgroundColor: COLORS.primary,
  },
  languageButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  languageButtonTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: "transparent",
  },
  createButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: COLORS.white,
  },
  suggestionsContainer: {
    gap: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  suggestionChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500" as const,
  },
});
