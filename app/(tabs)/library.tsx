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
import { BookOpen, Trash2, Heart, Clock, Headphones } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { useStories } from "@/contexts/StoryContext";
import { COLORS } from "@/constants/colors";
import { Story } from "@/types/story";

const AMBIENCE_COLORS: Record<string, string> = {
  forest: "#4CAF82",
  castle: "#8B5CF6",
  city:   "#F5A623",
  port:   "#5B9EC9",
  cave:   "#78716C",
  desert: "#E85C4A",
};

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function LibraryScreen() {
  const { stories, deleteStory, toggleFavorite } = useStories();
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const displayed =
    filter === "favorites" ? stories.filter((s) => s.isFavorite) : stories;

  const handleDelete = (story: Story) => {
    Alert.alert(
      story.language === "en" ? "Delete Story" : "Eliminar Historia",
      story.language === "en"
        ? "Are you sure you want to delete this story?"
        : "¿Estás seguro de que quieres eliminar esta historia?",
      [
        {
          text: story.language === "en" ? "Cancel" : "Cancelar",
          style: "cancel",
        },
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

  const renderCard = ({ item }: { item: Story }) => {
    const accent = AMBIENCE_COLORS[item.ambience ?? ""] ?? COLORS.primary;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/player/${item.id}` as any);
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={styles.cardInner}>
          <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
            <BookOpen size={22} color={accent} strokeWidth={2} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.prompt}
            </Text>
            <View style={styles.metaRow}>
              <Clock size={11} color={COLORS.textTertiary} strokeWidth={2} />
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaText}>
                {item.language === "en" ? "EN" : "ES"}
              </Text>
              {item.audioGenerated && (
                <>
                  <View style={styles.dot} />
                  <Headphones size={11} color={COLORS.success} strokeWidth={2} />
                </>
              )}
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                size={18}
                color={item.isFavorite ? COLORS.error : COLORS.textTertiary}
                fill={item.isFavorite ? COLORS.error : "none"}
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={18} color={COLORS.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight, COLORS.background]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.2, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Library</Text>
          <Text style={styles.headerSub}>
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </Text>
        </View>
        <View style={styles.filterRow}>
          {(["all", "favorites"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => {
                setFilter(f);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              {f === "favorites" && (
                <Heart
                  size={13}
                  color={filter === f ? COLORS.primary : COLORS.cream}
                  fill={filter === f ? COLORS.primary : "none"}
                  strokeWidth={2}
                />
              )}
              <Text
                style={[
                  styles.filterTabText,
                  filter === f && styles.filterTabTextActive,
                ]}
              >
                {f === "all" ? "All Stories" : "Favorites"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <BookOpen size={36} color={COLORS.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === "favorites" ? "No favorites yet" : "No stories yet"}
          </Text>
          <Text style={styles.emptyText}>
            {filter === "favorites"
              ? "Tap the heart on any story to save it here"
              : "Create your first magical story from the Home tab"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 0 },
  headerContent: { marginBottom: 20 },
  headerTitle: {
    fontSize: 32, fontWeight: "800" as const,
    color: COLORS.cream, letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14, color: COLORS.cream, opacity: 0.8,
    marginTop: 2, fontWeight: "500" as const,
  },
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 20 },
  filterTab: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 100, gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  filterTabActive: { backgroundColor: COLORS.surface },
  filterTabText: {
    fontSize: 13, fontWeight: "600" as const,
    color: COLORS.cream, opacity: 0.9,
  },
  filterTabTextActive: { color: COLORS.primary, opacity: 1 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    flexDirection: "row", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  accentBar: { width: 4 },
  cardInner: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  cardContent: { flex: 1, gap: 5 },
  cardTitle: {
    fontSize: 15, fontWeight: "600" as const,
    color: COLORS.text, lineHeight: 21,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: "500" as const },
  dot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: COLORS.textTertiary, opacity: 0.5,
  },
  actions: { gap: 8, alignItems: "center" },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center", justifyContent: "center",
  },
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 48, paddingBottom: 80,
  },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryMuted,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20, fontWeight: "700" as const,
    color: COLORS.text, marginBottom: 8, textAlign: "center",
  },
  emptyText: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 21,
  },
});
