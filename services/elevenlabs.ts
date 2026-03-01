import AsyncStorage from "@react-native-async-storage/async-storage";
import { CharacterVoiceSpec } from "@/types/story";

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICES_CACHE_KEY = "elevenlabs_voices_v2";
const VOICE_ID_CACHE_KEY = "elevenlabs_voice_id_map";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Absolute final fallback — deterministic narrator voice
const DEFAULT_NARRATOR_VOICE_ID = "cgSgspJ2msm6clMCkdW9";

// Category priority for scoring
const CATEGORY_SCORE: Record<string, number> = {
  premade: 40,
  professional: 30,
  generated: 20,
  cloned: 10,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
  };
}

interface VoicesCacheEntry {
  voices: ElevenLabsVoice[];
  timestamp: number;
}

// ─── In-memory session state ──────────────────────────────────────────────────

let cachedVoices: ElevenLabsVoice[] | null = null;
const characterVoiceMap = new Map<string, string>(); // characterKey → voice_id

// ─── Voice fetching with pagination ──────────────────────────────────────────

async function fetchAllVoicesV2(): Promise<ElevenLabsVoice[]> {
  // 1. In-memory cache
  if (cachedVoices) return cachedVoices;

  // 2. AsyncStorage cache (24h TTL)
  try {
    const raw = await AsyncStorage.getItem(VOICES_CACHE_KEY);
    if (raw) {
      const entry: VoicesCacheEntry = JSON.parse(raw);
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        cachedVoices = entry.voices;
        console.log(`[EL] Loaded ${cachedVoices.length} voices from AsyncStorage cache`);
        return cachedVoices;
      }
    }
  } catch {}

  // 3. Fetch from V2 API with pagination
  const allVoices: ElevenLabsVoice[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const url = new URL("https://api.elevenlabs.io/v2/voices");
      url.searchParams.set("page_size", "100");
      if (pageToken) url.searchParams.set("page_token", pageToken);

      const response = await fetch(url.toString(), {
        headers: { "xi-api-key": ELEVENLABS_API_KEY || "" },
      });

      if (!response.ok) {
        console.warn("[EL] V2 API failed, falling back to V1");
        return fetchVoicesV1Fallback();
      }

      const data = await response.json();
      allVoices.push(...(data.voices || []));
      pageToken = data.has_more ? (data.next_page_token ?? null) : null;
    } while (pageToken);

    console.log(`[EL] Fetched ${allVoices.length} voices from ElevenLabs V2 (paginated)`);

    const entry: VoicesCacheEntry = { voices: allVoices, timestamp: Date.now() };
    await AsyncStorage.setItem(VOICES_CACHE_KEY, JSON.stringify(entry));

    cachedVoices = allVoices;
    return allVoices;
  } catch (error) {
    console.error("[EL] Error fetching voices:", error);
    return fetchVoicesV1Fallback();
  }
}

async function fetchVoicesV1Fallback(): Promise<ElevenLabsVoice[]> {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY || "" },
    });
    if (!response.ok) return [];
    const data = await response.json();
    const voices: ElevenLabsVoice[] = data.voices || [];
    cachedVoices = voices;
    console.log(`[EL] V1 fallback: loaded ${voices.length} voices`);
    return voices;
  } catch {
    return [];
  }
}

// ─── Label normalizers ────────────────────────────────────────────────────────

function normalizeGender(label?: string): "male" | "female" | "unknown" {
  const g = label?.toLowerCase() ?? "";
  if (g === "male") return "male";
  if (g === "female") return "female";
  return "unknown";
}

function normalizeAge(label?: string): "child" | "teen" | "adult" | "elderly" | "unknown" {
  const a = label?.toLowerCase() ?? "";
  if (a.includes("child") || a.includes("young") || a.includes("kid")) return "child";
  if (a.includes("teen")) return "teen";
  if (a.includes("old") || a.includes("elder") || a.includes("senior")) return "elderly";
  if (a.includes("middle") || a.includes("adult")) return "adult";
  return "unknown";
}

// ─── Hard gender/age filters ──────────────────────────────────────────────────

// CRITICAL: Never assign male voice to female character or vice versa.
function filterByGender(
  voices: ElevenLabsVoice[],
  spec: CharacterVoiceSpec
): ElevenLabsVoice[] {
  if (spec.gender === "neutral") return voices;
  return voices.filter(v => normalizeGender(v.labels?.gender) === spec.gender);
}

function filterByAge(
  voices: ElevenLabsVoice[],
  spec: CharacterVoiceSpec,
  strict: boolean
): ElevenLabsVoice[] {
  if (!strict) return voices;
  return voices.filter(v => {
    const age = normalizeAge(v.labels?.age);
    if (age === "unknown") return false; // exclude unknowns in strict mode
    switch (spec.age) {
      case "child":   return age === "child";
      case "teen":    return age === "teen" || age === "child";
      case "adult":   return age === "adult" || age === "teen";
      case "elderly": return age === "elderly" || age === "adult";
      default: return true;
    }
  });
}

// ─── Soft scoring ─────────────────────────────────────────────────────────────

function scoreVoice(voice: ElevenLabsVoice, spec: CharacterVoiceSpec): number {
  let score = 0;
  const labels = voice.labels ?? {};
  const combined = [
    voice.name,
    labels.accent,
    labels.description,
    labels.use_case,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Category priority
  score += CATEGORY_SCORE[voice.category?.toLowerCase() ?? ""] ?? 0;

  // Accent match
  if (spec.accent) {
    if (combined.includes(spec.accent.toLowerCase())) score += 30;
  }

  // Tone keywords
  if (spec.tone) {
    for (const word of spec.tone.toLowerCase().split(/\s+/)) {
      if (word.length > 2 && combined.includes(word)) score += 20;
    }
  }

  // Use-case bonus for narration
  if (/narrat|storytell/.test(labels.use_case?.toLowerCase() ?? "")) score += 25;

  // General quality signals
  if (/warm|friendly|clear|natural/.test(combined)) score += 10;

  return score;
}

// ─── Deterministic sort: score↓ → name↑ → voice_id↑ ─────────────────────────

function sortByScore(
  scored: Array<{ voice: ElevenLabsVoice; score: number }>
): Array<{ voice: ElevenLabsVoice; score: number }> {
  return [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const nameCmp = a.voice.name.localeCompare(b.voice.name);
    if (nameCmp !== 0) return nameCmp;
    return a.voice.voice_id.localeCompare(b.voice.voice_id);
  });
}

// ─── Voice selection with fallback ladder ─────────────────────────────────────

function selectBestVoiceId(
  spec: CharacterVoiceSpec,
  voices: ElevenLabsVoice[],
  usedVoiceIds: Set<string>
): string {
  const available = voices.filter(v => !usedVoiceIds.has(v.voice_id));

  const pickBest = (pool: ElevenLabsVoice[], label: string): string | null => {
    if (pool.length === 0) return null;
    const sorted = sortByScore(pool.map(v => ({ voice: v, score: scoreVoice(v, spec) })));
    console.log(`[EL] ${label}: ${sorted[0].voice.name} (score ${sorted[0].score})`);
    return sorted[0].voice.voice_id;
  };

  // Attempt 1: strict gender + strict age
  let pool = filterByAge(filterByGender(available, spec), spec, true);
  const strict = pickBest(pool, "Strict match");
  if (strict) return strict;

  // Fallback 1: relax age, keep gender strict
  pool = filterByGender(available, spec);
  const ageRelaxed = pickBest(pool, "Age-relaxed match");
  if (ageRelaxed) return ageRelaxed;

  // Fallback 2: relax gender ONLY if spec is neutral (never relax male/female rule)
  if (spec.gender === "neutral" && available.length > 0) {
    const neutral = pickBest(available, "Gender-relaxed (neutral)");
    if (neutral) return neutral;
  }

  // Final fallback: deterministic default narrator voice
  console.warn(
    `[EL] No suitable voice for spec ${JSON.stringify(spec)}, using default narrator`
  );
  return DEFAULT_NARRATOR_VOICE_ID;
}

// ─── Public: resolve voice IDs for a character spec map ──────────────────────

export async function resolveVoiceIds(
  characterSpecs: Record<string, CharacterVoiceSpec>
): Promise<Record<string, string>> {
  // Try AsyncStorage cache — only use if ALL requested characters are present
  try {
    const raw = await AsyncStorage.getItem(VOICE_ID_CACHE_KEY);
    if (raw) {
      const cached: Record<string, string> = JSON.parse(raw);
      const lowerCached = Object.fromEntries(
        Object.entries(cached).map(([k, v]) => [k.toLowerCase(), v])
      );
      const allPresent = Object.keys(characterSpecs).every(
        name => name.toLowerCase() in lowerCached
      );
      if (allPresent) {
        console.log("[EL] Loaded voice ID mapping from AsyncStorage cache");
        Object.entries(lowerCached).forEach(([name, id]) =>
          characterVoiceMap.set(name, id)
        );
        return cached;
      }
    }
  } catch {}

  const voices = await fetchAllVoicesV2();
  const result: Record<string, string> = {};
  const usedVoiceIds = new Set<string>();

  for (const [characterName, spec] of Object.entries(characterSpecs)) {
    const voiceId = selectBestVoiceId(spec, voices, usedVoiceIds);
    result[characterName] = voiceId;
    usedVoiceIds.add(voiceId);
    characterVoiceMap.set(characterName.toLowerCase(), voiceId);
    console.log(`[EL] Assigned: ${characterName} → ${voiceId.substring(0, 10)}...`);
  }

  try {
    await AsyncStorage.setItem(VOICE_ID_CACHE_KEY, JSON.stringify(result));
  } catch {}

  return result;
}

// ─── Infer spec from speaker type (backward compat for old stories) ───────────

function inferSpecFromType(
  speakerType: string,
  description: string
): CharacterVoiceSpec {
  const t = speakerType.toLowerCase();
  const d = description.toLowerCase();

  let gender: CharacterVoiceSpec["gender"] = "neutral";
  let age: CharacterVoiceSpec["age"] = "adult";

  // Gender
  if (
    ["girl", "woman", "old_woman", "fairy"].includes(t) ||
    /\bfemale\b|\bgirl\b|\bwoman\b/.test(d)
  ) {
    gender = "female";
  } else if (
    ["boy", "man", "old_man", "dragon", "monster", "wizard"].includes(t) ||
    /\bmale\b|\bman\b|\bboy\b/.test(d)
  ) {
    gender = "male";
  }

  // Age
  if (
    t === "girl" ||
    t === "boy" ||
    /\bchild\b|\byoung\b|\bkid\b|\b[5-9]\b|\b1[0-2]\b/.test(d)
  ) {
    age = "child";
  } else if (
    t === "old_man" ||
    t === "old_woman" ||
    /\bold\b|\belder|\bgrandmother\b|\bgrandfather\b|\bancian/.test(d)
  ) {
    age = "elderly";
  }

  return { gender, age };
}

// ─── Public: assign voices from StoryLine array (backward compatible) ─────────

export async function assignVoicesToCharacters(
  storyLines: {
    speaker: string;
    characterName?: string;
    characterDescription?: string;
    voiceSpec?: CharacterVoiceSpec;
    text?: string;
  }[]
): Promise<void> {
  console.log(
    "\n============================================================"
  );
  console.log("     ASSIGNING VOICES TO CHARACTERS                         ");
  console.log("============================================================");
  characterVoiceMap.clear();

  const characterSpecs: Record<string, CharacterVoiceSpec> = {};

  for (const line of storyLines) {
    const key = (line.characterName || line.speaker || "").toLowerCase().trim();
    if (!key || key in characterSpecs) continue;

    characterSpecs[key] =
      line.voiceSpec ??
      inferSpecFromType(line.speaker, line.characterDescription ?? "");
  }

  console.log(`Unique characters: ${Object.keys(characterSpecs).length}`);
  Object.entries(characterSpecs).forEach(([name, spec]) =>
    console.log(`  ${name}: ${JSON.stringify(spec)}`)
  );

  await resolveVoiceIds(characterSpecs);

  console.log("\nFINAL VOICE MAPPING:");
  characterVoiceMap.forEach((id, key) =>
    console.log(`  ${key.padEnd(24)} → ${id.substring(0, 10)}...`)
  );
  console.log("============================================================\n");
}

// ─── Internal: look up voice for a character ──────────────────────────────────

function getVoiceForCharacter(
  characterName: string,
  speakerType: string
): string {
  const key1 = characterName.toLowerCase().trim();
  const key2 = speakerType.toLowerCase().trim();
  const voiceId = characterVoiceMap.get(key1) ?? characterVoiceMap.get(key2);

  if (!voiceId) {
    console.warn(
      `[EL] No voice for "${key1}" / "${key2}", using default narrator`
    );
    return DEFAULT_NARRATOR_VOICE_ID;
  }

  return voiceId;
}

// ─── Public: reset cache ──────────────────────────────────────────────────────

export function resetVoiceCache(): void {
  characterVoiceMap.clear();
  AsyncStorage.removeItem(VOICE_ID_CACHE_KEY).catch(() => {});
  console.log("[EL] Voice cache reset");
}

// ─── Quota error helpers ──────────────────────────────────────────────────────

export const ELEVENLABS_QUOTA_ERROR_PREFIX = "ELEVENLABS_QUOTA_EXCEEDED::";

function isQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("quota_exceeded") ||
    lower.includes("exceeds your quota") ||
    lower.includes("credits remaining")
  );
}

// ─── Public: generate TTS ─────────────────────────────────────────────────────

export async function generateTTS(
  speakerType: string,
  text: string,
  language: "en" | "es" = "en",
  characterDescription: string = "",
  characterName: string = ""
): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error(
      "ElevenLabs API key is missing. Please set EXPO_PUBLIC_ELEVENLABS_API_KEY."
    );
  }

  const voiceId = getVoiceForCharacter(characterName, speakerType);
  console.log(
    `[EL] TTS "${speakerType}" (${characterName || "—"}) → ${voiceId.substring(0, 10)}...`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `ElevenLabs API error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        errorMessage =
          parsed.detail?.message ?? parsed.detail ?? errorText ?? errorMessage;
      } catch {}
      if (isQuotaError(errorMessage)) {
        throw new Error(`${ELEVENLABS_QUOTA_ERROR_PREFIX}${errorMessage}`);
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = e => reject(e);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError")
        throw new Error("Request timeout - please try again");
      if (isQuotaError(error.message))
        throw new Error(`${ELEVENLABS_QUOTA_ERROR_PREFIX}${error.message}`);
    }
    throw error;
  }
}
