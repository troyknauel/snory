import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Story } from "@/types/story";

const STORAGE_KEY = "@snory_stories";

export const [StoryProvider, useStories] = createContextHook(() => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      console.log("[StoryContext] Loading stories from AsyncStorage...");
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log(`[StoryContext] Loaded ${parsed.length} stories`);
        setStories(parsed);
      } else {
        console.log("[StoryContext] No stories found in storage");
      }
    } catch (error) {
      console.error("[StoryContext] Error loading stories:", error);
    } finally {
      console.log("[StoryContext] Finished loading stories");
      setIsLoading(false);
    }
  };



  const addStory = useCallback((story: Story) => {
    setStories(prevStories => {
      const updatedStories = [story, ...prevStories];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStories)).catch(console.error);
      return updatedStories;
    });
  }, []);

  const updateStory = useCallback((id: string, updates: Partial<Story>) => {
    setStories(prevStories => {
      const updatedStories = prevStories.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStories)).catch(console.error);
      return updatedStories;
    });
  }, []);

  const deleteStory = useCallback((id: string) => {
    setStories(prevStories => {
      const updatedStories = prevStories.filter((s) => s.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStories)).catch(console.error);
      return updatedStories;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setStories(prevStories => {
      const updatedStories = prevStories.map((s) =>
        s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStories)).catch(console.error);
      return updatedStories;
    });
  }, []);

  const getStoryById = useCallback((id: string): Story | undefined => {
    return stories.find((s) => s.id === id);
  }, [stories]);

  return {
    stories,
    isLoading,
    addStory,
    updateStory,
    deleteStory,
    toggleFavorite,
    getStoryById,
  };
});
