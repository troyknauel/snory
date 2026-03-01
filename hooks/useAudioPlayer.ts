import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { AudioLine } from "@/types/story";
import { Audio as ExpoAudio } from "expo-av";
import { Platform } from "react-native";
import { useCallback, useRef, useState } from "react";

type AmbienceKey = "forest" | "castle" | "city" | "port" | "cave" | "desert" | "default";

const clamp01 = (v: number) => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
};

const AMBIENCE_URLS: Record<AmbienceKey, string[]> = {
  forest: [
    "https://cdn.pixabay.com/audio/2022/03/10/audio_08b48f340f.mp3",
    "https://cdn.pixabay.com/audio/2021/09/06/audio_0b3c0a6d8a.mp3",
  ],
  city: [
    "https://cdn.pixabay.com/audio/2022/02/23/audio_1b3dc03c45.mp3",
    "https://cdn.pixabay.com/audio/2022/03/15/audio_7c2a9e8d5e.mp3",
  ],
  port: [
    "https://cdn.pixabay.com/audio/2022/03/10/audio_5c2c17cd0e.mp3",
    "https://cdn.pixabay.com/audio/2021/09/20/audio_8f7b6d3a0f.mp3",
  ],
  castle: [
    "https://cdn.pixabay.com/audio/2022/08/04/audio_9fbb4f74c9.mp3",
    "https://cdn.pixabay.com/audio/2022/01/21/audio_1d8c9c4f66.mp3",
  ],
  cave: [
    "https://cdn.pixabay.com/audio/2022/03/15/audio_98a1f2f1b6.mp3",
    "https://cdn.pixabay.com/audio/2022/03/08/audio_6e2f8dbf1f.mp3",
  ],
  desert: [
    "https://cdn.pixabay.com/audio/2022/03/10/audio_39b1a9d2da.mp3",
    "https://cdn.pixabay.com/audio/2022/02/23/audio_5f0b2b8ec1.mp3",
  ],
  default: ["https://cdn.pixabay.com/audio/2022/03/10/audio_08b48f340f.mp3"],
};

function pickAmbienceUrls(ambience?: string): { key: AmbienceKey; urls: string[] } {
  const raw = (ambience || "default").toLowerCase().trim();
  const key: AmbienceKey =
    raw === "forest" || raw === "castle" || raw === "city" || raw === "port" || raw === "cave" || raw === "desert"
      ? (raw as AmbienceKey)
      : "default";

  const list = AMBIENCE_URLS[key] || AMBIENCE_URLS.default;
  const urls = list.length > 0 ? list : AMBIENCE_URLS.default;
  return { key, urls };
}

const isNotSupportedError = (e: unknown): boolean => {
  const err = e as { name?: string; message?: string };
  const msg = (err?.message || "").toLowerCase();
  return err?.name === "NotSupportedError" || msg.includes("no supported source") || msg.includes("notsupportederror");
};

export function useAudioPlayer() {
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const { musicEnabled, musicVolume, voiceVolume, setMusicEnabled, setMusicVolume, setVoiceVolume } = useAudioSettings();

  const voiceSoundRef = useRef<ExpoAudio.Sound | null>(null);
  const ambienceSoundRef = useRef<ExpoAudio.Sound | null>(null);
  const webAmbienceRef = useRef<HTMLAudioElement | null>(null);
  const audioLinesRef = useRef<AudioLine[]>([]);

  const ambienceSessionRef = useRef<number>(0);
  const ambienceQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueAmbienceOp = useCallback((label: string, op: () => Promise<void>) => {
    const run = async () => {
      console.log(`[AudioPlayer] Ambience op start: ${label}`);
      try {
        await op();
      } finally {
        console.log(`[AudioPlayer] Ambience op end: ${label}`);
      }
    };

    const next = ambienceQueueRef.current.then(run, run);
    ambienceQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const isSoundLoadedSafe = useCallback(async (sound: ExpoAudio.Sound): Promise<boolean> => {
    try {
      const status = await sound.getStatusAsync();
      return Boolean(status.isLoaded);
    } catch (e) {
      console.warn("[AudioPlayer] getStatusAsync failed (treat as not loaded)", e);
      return false;
    }
  }, []);

  const isNotLoadedError = (e: unknown): boolean => {
    const msg = ((e as { message?: string } | null | undefined)?.message || "").toLowerCase();
    return msg.includes("sound is not loaded") || msg.includes("not loaded");
  };

  const stopAmbience = useCallback(async () => {
    const mySession = ++ambienceSessionRef.current;

    await enqueueAmbienceOp(`stop (session=${mySession})`, async () => {
      try {
        if (Platform.OS === "web") {
          const a = webAmbienceRef.current;
          if (!a) return;
          webAmbienceRef.current = null;

          try {
            a.pause();
          } catch (e) {
            console.warn("[AudioPlayer] stopAmbience web pause error:", e);
          }

          try {
            a.src = "";
            a.load();
          } catch (e) {
            console.warn("[AudioPlayer] stopAmbience web cleanup error:", e);
          }
          return;
        }

        const s = ambienceSoundRef.current;
        if (!s) return;

        ambienceSoundRef.current = null;

        const loaded = await isSoundLoadedSafe(s);
        if (loaded) {
          try {
            await s.stopAsync();
          } catch (e) {
            if (!isNotLoadedError(e)) {
              console.error("[AudioPlayer] stopAmbience stopAsync error:", e);
            } else {
              console.warn("[AudioPlayer] stopAmbience stopAsync ignored (not loaded)");
            }
          }
        }

        try {
          await s.unloadAsync();
        } catch (e) {
          if (!isNotLoadedError(e)) {
            console.error("[AudioPlayer] stopAmbience unloadAsync error:", e);
          } else {
            console.warn("[AudioPlayer] stopAmbience unloadAsync ignored (not loaded)");
          }
        }
      } catch (e) {
        console.error("[AudioPlayer] stopAmbience error:", e);
      }
    });
  }, [enqueueAmbienceOp, isSoundLoadedSafe]);

  const startAmbience = useCallback(
    async (ambience?: string) => {
      if (!musicEnabled) return;

      const sessionAtCall = ambienceSessionRef.current;

      await enqueueAmbienceOp(`start (session=${sessionAtCall})`, async () => {
        if (!musicEnabled) return;
        if (sessionAtCall !== ambienceSessionRef.current) {
          console.log("[AudioPlayer] startAmbience aborted: session changed before start");
          return;
        }

        try {
          if (Platform.OS === "web") {
            const existing = webAmbienceRef.current;
            if (existing) {
              existing.volume = clamp01(musicVolume);
              try {
                await existing.play();
              } catch (e) {
                console.warn("[AudioPlayer] Existing web ambience play error:", e);
              }
              return;
            }

            const picked = pickAmbienceUrls(ambience);
            console.log("[AudioPlayer] Loading ambience (web):", picked);

            const initialVolume = clamp01(musicVolume);
            const shuffled = [...picked.urls].sort(() => Math.random() - 0.5);

            let created: HTMLAudioElement | null = null;
            let lastError: unknown = null;

            const tryCreateAndPlay = async (url: string): Promise<HTMLAudioElement> => {
              const AudioCtor = (globalThis as unknown as { Audio?: typeof Audio }).Audio;
              if (!AudioCtor) {
                throw new Error("HTML Audio is not available");
              }
              const a = new AudioCtor();
              a.preload = "auto";
              a.loop = true;
              a.src = url;
              a.volume = initialVolume;

              const formatMediaError = (err: MediaError | null) => {
                if (!err) return null;
                const code = err.code;
                const codeName =
                  code === 1
                    ? "MEDIA_ERR_ABORTED"
                    : code === 2
                      ? "MEDIA_ERR_NETWORK"
                      : code === 3
                        ? "MEDIA_ERR_DECODE"
                        : code === 4
                          ? "MEDIA_ERR_SRC_NOT_SUPPORTED"
                          : "UNKNOWN";
                return { code, codeName };
              };

              await new Promise<void>((resolve, reject) => {
                let settled = false;

                const finalize = (fn: () => void) => {
                  if (settled) return;
                  settled = true;
                  cleanup();
                  fn();
                };

                const onCanPlay = () => {
                  finalize(() => resolve());
                };
                const onError = () => {
                  const media = formatMediaError(a.error);
                  finalize(() => reject(new Error(JSON.stringify({ url, media }))));
                };
                const cleanup = () => {
                  a.removeEventListener("canplaythrough", onCanPlay);
                  a.removeEventListener("canplay", onCanPlay);
                  a.removeEventListener("loadedmetadata", onCanPlay);
                  a.removeEventListener("error", onError);
                };

                a.addEventListener("canplaythrough", onCanPlay);
                a.addEventListener("canplay", onCanPlay);
                a.addEventListener("loadedmetadata", onCanPlay);
                a.addEventListener("error", onError);

                try {
                  a.load();
                } catch (e) {
                  finalize(() => reject(e));
                  return;
                }

                setTimeout(() => {
                  const media = formatMediaError(a.error);
                  finalize(() => reject(new Error(JSON.stringify({ url, timeoutMs: 12000, media }))));
                }, 12000);
              });

              try {
                a.currentTime = 0;
              } catch {
                // noop
              }

              await a.play();
              return a;
            };

            for (const url of shuffled) {
              if (sessionAtCall !== ambienceSessionRef.current || !musicEnabled) {
                console.log("[AudioPlayer] startAmbience(web): session changed before loop finished");
                return;
              }

              console.log("[AudioPlayer] Trying ambience source (web):", { key: picked.key, url });

              try {
                const a = await tryCreateAndPlay(url);
                created = a;
                break;
              } catch (e) {
                lastError = e;
                const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
                if (msg.includes("not supported") || msg.includes("no supported")) {
                  console.warn("[AudioPlayer] Web ambience not supported, trying next", e);
                } else {
                  console.warn("[AudioPlayer] Web ambience failed, trying next", e);
                }
              }
            }

            if (!created) {
              const errorDetails = {
                key: picked.key,
                urls: picked.urls,
                lastError: lastError instanceof Error ? lastError.message : String(lastError),
              };
              console.error("[AudioPlayer] Failed to load any ambience source (web):", JSON.stringify(errorDetails, null, 2));
              console.error("[AudioPlayer] Raw error:", lastError);
              return;
            }

            if (sessionAtCall !== ambienceSessionRef.current || !musicEnabled) {
              console.log("[AudioPlayer] startAmbience(web): session changed after success, cleaning up");
              try {
                created.pause();
                created.src = "";
                created.load();
              } catch {
                // noop
              }
              return;
            }

            webAmbienceRef.current = created;
            return;
          }

          const existing = ambienceSoundRef.current;
          if (existing) {
            const loaded = await isSoundLoadedSafe(existing);
            if (!loaded) {
              console.warn("[AudioPlayer] Existing ambience is not loaded; resetting ref");
              ambienceSoundRef.current = null;
            } else {
              await existing.setVolumeAsync(clamp01(musicVolume));
              try {
                await existing.playAsync();
              } catch (e) {
                const err = e as { name?: string; message?: string };
                const msg = (err?.message || "").toLowerCase();
                if (isNotLoadedError(e)) {
                  console.warn("[AudioPlayer] Existing ambience playAsync ignored (not loaded)");
                  ambienceSoundRef.current = null;
                  return;
                }
                if (err?.name === "AbortError" || msg.includes("interrupted") || msg.includes("pause")) {
                  console.warn("[AudioPlayer] Ambience playAsync interrupted, will ignore", err);
                  return;
                }
                throw e;
              }
              return;
            }
          }

          const picked = pickAmbienceUrls(ambience);
          console.log("[AudioPlayer] Loading ambience:", picked);

          const initialVolume = clamp01(musicVolume);
          console.log("[AudioPlayer] Ambience initial volume:", initialVolume);

          const shuffled = [...picked.urls].sort(() => Math.random() - 0.5);

          let createdSound: ExpoAudio.Sound | null = null;
          let lastError: unknown = null;

          for (const url of shuffled) {
            if (sessionAtCall !== ambienceSessionRef.current || !musicEnabled) {
              console.log("[AudioPlayer] startAmbience: session changed before create loop finished");
              return;
            }

            console.log("[AudioPlayer] Trying ambience source:", { key: picked.key, url });

            try {
              const { sound } = await ExpoAudio.Sound.createAsync(
                { uri: url },
                {
                  shouldPlay: false,
                  isLooping: true,
                  volume: initialVolume,
                }
              );

              try {
                await sound.playAsync();
                createdSound = sound;
                break;
              } catch (e) {
                if (isNotSupportedError(e)) {
                  console.warn("[AudioPlayer] Ambience source not supported, trying next", e);
                  try {
                    await sound.unloadAsync();
                  } catch {
                    // noop
                  }
                  lastError = e;
                  continue;
                }

                const err = e as { name?: string; message?: string };
                const msg = (err?.message || "").toLowerCase();
                if (err?.name === "AbortError" || msg.includes("interrupted") || msg.includes("pause")) {
                  console.warn("[AudioPlayer] Ambience playAsync interrupted after create, will ignore", err);
                  try {
                    await sound.unloadAsync();
                  } catch {
                    // noop
                  }
                  return;
                }

                try {
                  await sound.unloadAsync();
                } catch {
                  // noop
                }

                lastError = e;
                continue;
              }
            } catch (e) {
              if (isNotSupportedError(e)) {
                console.warn("[AudioPlayer] Ambience source not supported at load, trying next", e);
                lastError = e;
                continue;
              }
              lastError = e;
              continue;
            }
          }

          if (!createdSound) {
            const errorDetails = {
              key: picked.key,
              urls: picked.urls,
              lastError: lastError instanceof Error ? lastError.message : String(lastError),
            };
            console.error("[AudioPlayer] Failed to load any ambience source:", JSON.stringify(errorDetails, null, 2));
            console.error("[AudioPlayer] Raw error:", lastError);
            return;
          }

          if (sessionAtCall !== ambienceSessionRef.current || !musicEnabled) {
            console.log("[AudioPlayer] startAmbience: session changed after successful create, unloading new sound");
            try {
              await createdSound.unloadAsync();
            } catch (e) {
              console.error("[AudioPlayer] startAmbience unload after cancel error:", e);
            }
            return;
          }

          ambienceSoundRef.current = createdSound;
        } catch (e) {
          console.error("[AudioPlayer] Error starting ambience:", e);
        }
      });
    },
    [enqueueAmbienceOp, isSoundLoadedSafe, musicEnabled, musicVolume]
  );

  const duckAmbience = useCallback(
    async (duck: boolean) => {
      try {
        if (!musicEnabled) return;

        const v = duck ? clamp01(musicVolume * 0.28) : clamp01(musicVolume);

        if (Platform.OS === "web") {
          const a = webAmbienceRef.current;
          if (!a) return;
          a.volume = v;
          return;
        }

        const s = ambienceSoundRef.current;
        if (!s) return;

        const loaded = await isSoundLoadedSafe(s);
        if (!loaded) {
          console.warn("[AudioPlayer] duckAmbience ignored (sound not loaded)");
          return;
        }

        await s.setVolumeAsync(v);
      } catch (e) {
        if (!isNotLoadedError(e)) {
          console.error("[AudioPlayer] duckAmbience error:", e);
        } else {
          console.warn("[AudioPlayer] duckAmbience ignored (not loaded)");
        }
      }
    },
    [isSoundLoadedSafe, musicEnabled, musicVolume]
  );

  const getVoiceGainForSpeaker = (speaker?: string): number => {
    const s = (speaker || "").toLowerCase().trim();
    if (s === "narrator") return 0.95;
    if (s === "moral") return 0.9;
    if (s === "dragon" || s === "monster") return 0.85;
    if (s === "wizard" || s === "old_man" || s === "old_woman") return 0.92;
    return 1;
  };

  const playLineAtIndex = async (index: number): Promise<void> => {
    const line = audioLinesRef.current[index];
    if (!line || !line.audioUrl) {
      setIsPlaying(false);
      setCurrentIndex(-1);
      await duckAmbience(false);
      return;
    }

    try {
      if (voiceSoundRef.current) {
        await voiceSoundRef.current.unloadAsync();
      }

      await duckAmbience(true);

      const perLineVolume = clamp01(voiceVolume * getVoiceGainForSpeaker(line.speaker));

      const { sound } = await ExpoAudio.Sound.createAsync(
        { uri: line.audioUrl },
        {
          shouldPlay: true,
          volume: perLineVolume,
        }
      );

      voiceSoundRef.current = sound;
      setCurrentIndex(index);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          const nextIndex = index + 1;
          if (nextIndex < audioLinesRef.current.length) {
            playLineAtIndex(nextIndex).catch(() => undefined);
          } else {
            setIsPlaying(false);
            setCurrentIndex(-1);
            duckAmbience(false).catch(() => undefined);
          }
        }
      });
    } catch (e) {
      console.error("[AudioPlayer] Error playing audio:", e);
      const nextIndex = index + 1;
      if (nextIndex < audioLinesRef.current.length) {
        await playLineAtIndex(nextIndex);
      } else {
        setIsPlaying(false);
        setCurrentIndex(-1);
        await duckAmbience(false);
      }
    }
  };

  const startPlayback = async (audioLines: AudioLine[], options?: { ambience?: string }) => {
    console.log("[AudioPlayer] startPlayback", {
      lines: audioLines.length,
      ambience: options?.ambience,
      musicEnabled,
      musicVolume,
      voiceVolume,
    });

    try {
      await ExpoAudio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      audioLinesRef.current = audioLines;
      setIsPlaying(true);

      await startAmbience(options?.ambience);

      if (audioLines.length > 0) {
        await playLineAtIndex(0);
      } else {
        setIsPlaying(false);
        setCurrentIndex(-1);
      }
    } catch (e) {
      console.error("[AudioPlayer] startPlayback error:", e);
      setIsPlaying(false);
      setCurrentIndex(-1);
      throw e;
    }
  };

  const stopPlayback = useCallback(async () => {
    try {
      if (voiceSoundRef.current) {
        await voiceSoundRef.current.stopAsync();
        await voiceSoundRef.current.unloadAsync();
        voiceSoundRef.current = null;
      }
    } catch (e) {
      console.error("[AudioPlayer] stopPlayback voice error:", e);
    }

    await stopAmbience();
    setIsPlaying(false);
    setCurrentIndex(-1);
  }, [stopAmbience]);

  const pausePlayback = useCallback(async () => {
    try {
      if (voiceSoundRef.current) {
        await voiceSoundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } catch (e) {
      console.error("[AudioPlayer] pausePlayback error:", e);
    }

    await duckAmbience(false);
  }, [duckAmbience]);

  const resumePlayback = useCallback(async () => {
    console.log("[AudioPlayer] resumePlayback", {
      hasVoice: Boolean(voiceSoundRef.current),
      currentIndex,
      musicEnabled,
    });

    try {
      if (musicEnabled) {
        await startAmbience();
      }

      if (voiceSoundRef.current) {
        await voiceSoundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("[AudioPlayer] resumePlayback error:", e);
      throw e;
    }

    await duckAmbience(true);
  }, [currentIndex, duckAmbience, musicEnabled, startAmbience]);

  const toggleBackgroundMusic = useCallback(async () => {
    const next = !musicEnabled;
    console.log("[AudioPlayer] toggleBackgroundMusic", { from: musicEnabled, to: next, isPlaying });
    setMusicEnabled(next);

    if (next && isPlaying) {
      await startAmbience();
    } else {
      await stopAmbience();
    }
  }, [isPlaying, musicEnabled, setMusicEnabled, startAmbience, stopAmbience]);

  const setBackgroundMusicVolume = useCallback(
    async (volume: number) => {
      const v = clamp01(volume);
      setMusicVolume(v);

      try {
        const actual = isPlaying ? clamp01(v * 0.28) : v;

        if (Platform.OS === "web") {
          if (webAmbienceRef.current) {
            webAmbienceRef.current.volume = actual;
          }
          return;
        }

        if (ambienceSoundRef.current) {
          await ambienceSoundRef.current.setVolumeAsync(actual);
        }
      } catch (e) {
        console.error("[AudioPlayer] setBackgroundMusicVolume error:", e);
      }
    },
    [isPlaying, setMusicVolume]
  );

  const setVoiceOutputVolume = useCallback(
    async (volume: number) => {
      const v = clamp01(volume);
      setVoiceVolume(v);

      try {
        if (voiceSoundRef.current) {
          await voiceSoundRef.current.setVolumeAsync(v);
        }
      } catch (e) {
        console.error("[AudioPlayer] setVoiceOutputVolume error:", e);
      }
    },
    [setVoiceVolume]
  );

  return {
    currentIndex,
    isPlaying,
    backgroundMusicEnabled: musicEnabled,
    backgroundVolume: musicVolume,
    voiceVolume,
    startPlayback,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    toggleBackgroundMusic,
    setBackgroundMusicVolume,
    setVoiceOutputVolume,
  };
}
