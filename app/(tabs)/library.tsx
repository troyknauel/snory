import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, Trash2, Heart, Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { useStories } from "@/contexts/StoryContext";
import { COLORS } from "@/constants/colors";
import { Story } from "@/types/story";

export default function LibraryScreen() {
  const { stories, deleteStory, toggleFavorite } = useStories();
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const filteredStories = filter === "favorites" 
    ? stories.filter(s => s.isFavorite)
    : stories;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = (story: Story) => {
    Alert.alert(
      story.language === "en" ? "Delete Story" : "Eliminar Historia",
      story.language === "en" 
        ? "Are you sure you want to delete this story?"
        : "¿Estás seguro de que quieres eliminar esta historia?",
      [
        { text: story.language === "en" ? "Cancel" : "Cancelar", style: "cancel" },
        {
          text: story.language === "en" ? "Delete" : "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteStory(story.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderStoryCard = ({ item }: { item: Story }) => (
    <TouchableOpacity
      style={styles.storyCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/player/${item.id}` as any);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.storyCardHeader}>
        <View style={styles.storyIconContainer}>
          <BookOpen size={24} color={COLORS.primary} />
        </View>
        <View style={styles.storyInfo}>
          <Text style={styles.storyPrompt} numberOfLines={2}>
            {item.prompt}
          </Text>
          <View style={styles.storyMeta}>
            <Clock size={12} color={COLORS.textLight} />
            <Text style={styles.storyMetaText}>
              {formatDate(item.createdAt)}
            </Text>
            <Text style={styles.storyMetaDivider}>•</Text>
            <Text style={styles.storyMetaText}>
              {item.language === "en" ? "English" : "Español"}
            </Text>
            {item.audioGenerated && (
              <>
                <Text style={styles.storyMetaDivider}>•</Text>
                <Text style={[styles.storyMetaText, styles.audioGenerated]}>🎵</Text>
              </>
            )}
          </View>
        </View>
      </View>
      <View style={styles.storyActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Heart
            size={20}
            color={item.isFavorite ? COLORS.error : COLORS.textLight}
            fill={item.isFavorite ? COLORS.error : "none"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}
        >
          <Trash2 size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.white]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Library</Text>
          <Text style={styles.headerSubtitle}>
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
          onPress={() => {
            setFilter("all");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterButtonText, filter === "all" && styles.filterButtonTextActive]}>
            All Stories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === "favorites" && styles.filterButtonActive]}
          onPress={() => {
            setFilter("favorites");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <Heart
            size={16}
            color={filter === "favorites" ? COLORS.white : COLORS.textLight}
            fill={filter === "favorites" ? COLORS.white : "none"}
          />
          <Text style={[styles.filterButtonText, filter === "favorites" && styles.filterButtonTextActive]}>
            Favorites
          </Text>
        </TouchableOpacity>
      </View>

      {filteredStories.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={64} color={COLORS.textLight} strokeWidth={1.5} />
          <Text style={styles.emptyStateTitle}>
            {filter === "favorites" ? "No favorites yet" : "No stories yet"}
          </Text>
          <Text style={styles.emptyStateText}>
            {filter === "favorites" 
              ? "Tap the heart icon to save your favorite stories"
              : "Create your first magical story from the Home tab"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStories}
          renderItem={renderStoryCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.cream,
    opacity: 0.9,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: COLORS.textLight,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  storyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  storyCardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  storyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  storyInfo: {
    flex: 1,
    gap: 6,
  },
  storyPrompt: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.text,
    lineHeight: 22,
  },
  storyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storyMetaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  storyMetaDivider: {
    fontSize: 12,
    color: COLORS.textLight,
    opacity: 0.5,
  },
  audioGenerated: {
    fontSize: 14,
  },
  storyActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 22,
  },
});
