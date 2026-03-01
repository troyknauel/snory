import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

type VolumeKey = "voice" | "music";

export interface AudioSettingsState {
  musicEnabled: boolean;
  voiceVolume: number;
  musicVolume: number;
  setMusicEnabled: (enabled: boolean) => void;
  setVoiceVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

const STORAGE_KEY = "@snory_audio_settings";

interface PersistedAudioSettings {
  musicEnabled: boolean;
  voiceVolume: number;
  musicVolume: number;
}

const clamp01 = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
};

const DEFAULT_SETTINGS: PersistedAudioSettings = {
  musicEnabled: true,
  voiceVolume: 1,
  musicVolume: 0.25,
};

export const [AudioSettingsProvider, useAudioSettings] = createContextHook(() => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [musicEnabled, setMusicEnabledState] = useState<boolean>(DEFAULT_SETTINGS.musicEnabled);
  const [voiceVolume, setVoiceVolumeState] = useState<number>(DEFAULT_SETTINGS.voiceVolume);
  const [musicVolume, setMusicVolumeState] = useState<number>(DEFAULT_SETTINGS.musicVolume);

  useEffect(() => {
    const load = async () => {
      try {
        console.log("[AudioSettings] Loading settings...");
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          console.log("[AudioSettings] No persisted settings found, using defaults");
          return;
        }
        const parsed = JSON.parse(raw) as Partial<PersistedAudioSettings>;
        console.log("[AudioSettings] Loaded persisted settings:", parsed);

        if (typeof parsed.musicEnabled === "boolean") setMusicEnabledState(parsed.musicEnabled);
        if (typeof parsed.voiceVolume === "number") setVoiceVolumeState(clamp01(parsed.voiceVolume));
        if (typeof parsed.musicVolume === "number") setMusicVolumeState(clamp01(parsed.musicVolume));
      } catch (e) {
        console.error("[AudioSettings] Failed to load settings:", e);
      } finally {
        setIsLoaded(true);
      }
    };

    load();
  }, []);

  const persist = useCallback(
    async (next: PersistedAudioSettings) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("[AudioSettings] Failed to persist settings:", e);
      }
    },
    []
  );

  const setMusicEnabled = useCallback(
    (enabled: boolean) => {
      setMusicEnabledState(enabled);
      persist({ musicEnabled: enabled, voiceVolume, musicVolume }).catch(() => undefined);
    },
    [musicVolume, persist, voiceVolume]
  );

  const setVolume = useCallback(
    (key: VolumeKey, volume: number) => {
      const v = clamp01(volume);
      if (key === "voice") setVoiceVolumeState(v);
      if (key === "music") setMusicVolumeState(v);

      persist({
        musicEnabled,
        voiceVolume: key === "voice" ? v : voiceVolume,
        musicVolume: key === "music" ? v : musicVolume,
      }).catch(() => undefined);
    },
    [musicEnabled, musicVolume, persist, voiceVolume]
  );

  const setVoiceVolume = useCallback((v: number) => setVolume("voice", v), [setVolume]);
  const setMusicVolume = useCallback((v: number) => setVolume("music", v), [setVolume]);

  const value = useMemo<AudioSettingsState>(
    () => ({
      musicEnabled,
      voiceVolume,
      musicVolume,
      setMusicEnabled,
      setVoiceVolume,
      setMusicVolume,
    }),
    [musicEnabled, musicVolume, setMusicEnabled, setMusicVolume, setVoiceVolume, voiceVolume]
  );

  if (!isLoaded) {
    console.log("[AudioSettings] Not loaded yet, using current state");
  }

  return value;
});
