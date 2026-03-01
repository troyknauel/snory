import { CharacterVoiceSpec, StoryLine } from "@/types/story";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

// ─── GPT contract types ───────────────────────────────────────────────────────

interface StoryPayload {
  ambience: string;
  characters: Record<string, CharacterVoiceSpec>;
  dialogue: Array<{ speaker: string; text: string }>;
}

// ─── Speaker type detection (kept for UI color/emoji mapping) ─────────────────

function detectSpeakerType(
  speakerName: string,
  characterDescription?: string
): string {
  const lowerName = speakerName.toLowerCase();
  const lowerDesc = characterDescription?.toLowerCase() ?? "";
  const combined = `${lowerName} ${lowerDesc}`;

  if (combined.includes("narrator") || combined.includes("narrador"))
    return "narrator";
  if (combined.includes("moral") || combined.includes("lesson"))
    return "moral";
  if (
    combined.includes("dragon") ||
    combined.includes("dragón") ||
    combined.includes("drake")
  )
    return "dragon";
  if (
    combined.includes("wizard") ||
    combined.includes("mago") ||
    combined.includes("maga") ||
    combined.includes("witch") ||
    combined.includes("bruja") ||
    combined.includes("sorcerer") ||
    combined.includes("enchanter") ||
    combined.includes("merlin")
  )
    return "wizard";
  if (
    combined.includes("king") ||
    combined.includes("rey") ||
    combined.includes("father") ||
    combined.includes("padre") ||
    combined.includes("old man") ||
    combined.includes("anciano") ||
    combined.includes("grandfather") ||
    combined.includes("abuelo")
  )
    return "old_man";
  if (
    combined.includes("queen") ||
    combined.includes("reina") ||
    combined.includes("mother") ||
    combined.includes("madre") ||
    combined.includes("old woman") ||
    combined.includes("anciana") ||
    combined.includes("grandmother") ||
    combined.includes("abuela")
  )
    return "old_woman";
  if (
    combined.includes("woman") ||
    combined.includes("mujer") ||
    combined.includes("lady") ||
    combined.includes("dama") ||
    combined.includes("female")
  )
    return "woman";
  if (
    combined.includes("girl") ||
    combined.includes("niña") ||
    combined.includes("chica") ||
    combined.includes("princess") ||
    combined.includes("princesa") ||
    combined.includes("daughter") ||
    combined.includes("hija") ||
    combined.includes("sister") ||
    combined.includes("hermana")
  )
    return "girl";
  if (
    combined.includes("boy") ||
    combined.includes("niño") ||
    combined.includes("chico") ||
    combined.includes("prince") ||
    combined.includes("príncipe") ||
    combined.includes("son") ||
    combined.includes("hijo") ||
    combined.includes("brother") ||
    combined.includes("hermano")
  )
    return "boy";
  if (
    combined.includes("man") ||
    combined.includes("hombre") ||
    combined.includes("knight") ||
    combined.includes("caballero") ||
    combined.includes("warrior") ||
    combined.includes("guerrero")
  )
    return "man";
  if (
    combined.includes("monster") ||
    combined.includes("monstruo") ||
    combined.includes("beast") ||
    combined.includes("bestia") ||
    combined.includes("troll") ||
    combined.includes("ogre") ||
    combined.includes("giant") ||
    combined.includes("gigante")
  )
    return "monster";
  if (
    combined.includes("fairy") ||
    combined.includes("hada") ||
    combined.includes("elf") ||
    combined.includes("elfo") ||
    combined.includes("pixie") ||
    combined.includes("sprite")
  )
    return "fairy";
  if (
    combined.includes("animal") ||
    combined.includes("cat") ||
    combined.includes("gato") ||
    combined.includes("dog") ||
    combined.includes("perro") ||
    combined.includes("bear") ||
    combined.includes("oso") ||
    combined.includes("wolf") ||
    combined.includes("lobo")
  )
    return "creature";

  return "default";
}

// ─── Derive speaker type from voice spec + name (for UI) ─────────────────────

function deriveTypeFromSpec(
  characterName: string,
  spec: CharacterVoiceSpec
): string {
  // Try keyword detection on the name first (handles Dragon, Fairy, Wizard, etc.)
  const nameType = detectSpeakerType(characterName, spec.tone ?? "");
  if (nameType !== "default") return nameType;

  // Fall back to gender + age mapping
  const { gender, age } = spec;
  if (gender === "female" && age === "child") return "girl";
  if (gender === "male" && age === "child") return "boy";
  if (gender === "female" && age === "elderly") return "old_woman";
  if (gender === "male" && age === "elderly") return "old_man";
  if (gender === "female") return "woman";
  if (gender === "male") return "man";
  return "narrator"; // neutral default
}

// ─── OpenAI TTS (fallback when ElevenLabs quota exceeded) ────────────────────

export async function generateOpenAITTS(
  text: string,
  options?: {
    voice?: "alloy";
    format?: "mp3";
  }
): Promise<string> {
  console.log("[OpenAI TTS] Generating speech...", {
    hasKey: !!OPENAI_API_KEY,
    textPreview: text.substring(0, 60),
    voice: options?.voice ?? "alloy",
    format: options?.format ?? "mp3",
  });

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is missing. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables."
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: options?.voice ?? "alloy",
        format: options?.format ?? "mp3",
        input: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("[OpenAI TTS] response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI TTS] API error response:", errorText);
      let errorMessage = `OpenAI TTS error: ${response.status}`;
      try {
        const error = JSON.parse(errorText);
        if (error.error?.message) errorMessage = error.error.message;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    console.log("[OpenAI TTS] Blob size:", blob.size);
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = e => {
        console.error("[OpenAI TTS] FileReader error:", e);
        reject(e);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("[OpenAI TTS] Error generating speech:", error);
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("Request timeout - please try again");
    throw error;
  }
}

// ─── Story generation with structured JSON contract ───────────────────────────

const JSON_SCHEMA_DESCRIPTION = `
Return ONLY valid JSON following this exact schema (no markdown, no prose):
{
  "ambience": "<one of: forest | castle | city | port | cave | desert>",
  "characters": {
    "<CharacterName>": {
      "gender": "<male | female | neutral>",
      "age": "<child | teen | adult | elderly>",
      "accent": "<e.g. Irish, British, American, general>",
      "tone": "<2-3 keywords, e.g. warm storyteller, playful curious, wise calm>"
    }
  },
  "dialogue": [
    { "speaker": "<CharacterName>", "text": "<line of dialogue or narration>" }
  ]
}

Schema rules:
- ambience must be exactly one of: forest, castle, city, port, cave, desert
- Every character who speaks in dialogue must appear in "characters"
- Always include "Narrator" and "Moral" as characters
- gender must be exactly: male, female, or neutral
- age must be exactly: child (5-12), teen (13-17), adult (18-59), or elderly (60+)
- Narrator: gender neutral, age adult, tone "warm storyteller"
- Moral: gender neutral, age adult, tone "warm wise"
- Fantasy creatures must have human voice targets: dragons are male/adult, fairies are female/child, owls are male/elderly, etc.
- dialogue must have exactly 20-28 entries
- No ambiguous values; no extra fields`;

const EN_SYSTEM_PROMPT = `You are an award-winning children's storyteller for ages 5–10.

Goal: create a story that feels clever, surprising, and cinematic while staying warm and kid-appropriate.

Story structure (follow exactly):
1. Opening: Set the scene (match ambience) and introduce the main character(s) through the Narrator
2. Inciting incident: Something unexpected starts the adventure
3. Rising action: Characters face challenges; new characters are introduced by the Narrator before they speak
4. Climax: The main problem peaks
5. Resolution: Problem is solved through the characters' strengths
6. Ending: Peace restored; Moral delivered last

Storytelling rules:
- Pick 3–5 recurring characters + Narrator + Moral (6–7 total)
- Each character must have a UNIQUE, memorable name
- The Narrator must introduce every new character before their first dialogue line
- Use distinct voices: different vocabulary, rhythm, and personality per character
- Include 1 clever mystery that pays off later
- Include 1 gentle comedic beat and 1 emotional beat
- Keep momentum: most lines should advance action or reveal character
- End with a Moral that names specific characters and events from the story

${JSON_SCHEMA_DESCRIPTION}`;

const ES_SYSTEM_PROMPT = `Eres un narrador premiado de cuentos infantiles para niños de 5 a 10 años.

Objetivo: crear una historia ingeniosa, sorprendente y muy visual, pero cálida y apropiada para niños.

Estructura del cuento (seguir exactamente):
1. Apertura: Establece el escenario (que coincida con el ambiente) e introduce al personaje principal a través del Narrador
2. Incidente inicial: Algo inesperado inicia la aventura
3. Desarrollo: Los personajes enfrentan desafíos; el Narrador introduce a cada nuevo personaje antes de que hable
4. Clímax: El problema principal llega a su punto máximo
5. Resolución: El problema se resuelve gracias a las fortalezas de los personajes
6. Final: Paz restaurada; la Moraleja se entrega al final

Reglas narrativas:
- Elige 3–5 personajes recurrentes + Narrador + Moral (6–7 en total)
- Cada personaje debe tener un nombre ÚNICO y memorable
- El Narrador debe presentar a cada nuevo personaje antes de su primera línea de diálogo
- Usa voces distintas: vocabulario, ritmo y personalidad diferentes por personaje
- Incluye 1 misterio ingenioso que se resuelva más adelante
- Incluye 1 momento cómico suave y 1 momento emocional
- Mantén el ritmo: la mayoría de líneas deben avanzar la acción o revelar el carácter del personaje
- Termina con una Moraleja que nombre personajes y eventos específicos del cuento

${JSON_SCHEMA_DESCRIPTION}`;

export async function generateStory(
  prompt: string,
  language: "en" | "es" = "en"
): Promise<StoryLine[]> {
  console.log("Generating story with prompt:", prompt);
  console.log("OpenAI API Key exists:", !!OPENAI_API_KEY);

  if (!OPENAI_API_KEY) {
    throw new Error(
      "OpenAI API key is missing. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment variables."
    );
  }

  const systemPrompt = language === "en" ? EN_SYSTEM_PROMPT : ES_SYSTEM_PROMPT;

  try {
    console.log("Making request to OpenAI API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.85,
          max_tokens: 2500,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    console.log("OpenAI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error response:", errorText);
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const error = JSON.parse(errorText);
        if (error.error?.message) errorMessage = error.error.message;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const rawContent: string = data.choices[0]?.message?.content ?? "";
    console.log("Raw GPT JSON:", rawContent.substring(0, 300));

    // Parse the structured JSON payload
    const payload: StoryPayload = JSON.parse(rawContent);

    const { ambience, characters, dialogue } = payload;

    if (!Array.isArray(dialogue) || dialogue.length === 0) {
      throw new Error("GPT returned empty or invalid dialogue array");
    }

    console.log(
      `Parsed story: ${dialogue.length} lines, ${Object.keys(characters).length} characters, ambience: ${ambience}`
    );

    // Build StoryLine[] from dialogue + character specs
    const lines: StoryLine[] = dialogue
      .filter(d => d.speaker && d.text?.trim())
      .map(d => {
        const spec = characters[d.speaker];
        const speakerType = spec
          ? deriveTypeFromSpec(d.speaker, spec)
          : detectSpeakerType(d.speaker);

        // Build a human-readable description from the spec for backward compat
        const characterDescription = spec
          ? [spec.age, spec.gender, spec.accent, spec.tone]
              .filter(Boolean)
              .join(" ")
          : "";

        return {
          speaker: speakerType,
          text: d.text.trim(),
          characterName: d.speaker,
          characterDescription,
          voiceSpec: spec,
        } as StoryLine;
      });

    if (lines.length === 0) {
      throw new Error("GPT returned no valid dialogue lines");
    }

    // Attach ambience to the array for backward-compat consumption in index.tsx
    (lines as any).ambience = ambience ?? "forest";

    return lines;
  } catch (error) {
    console.error("Error generating story:", error);
    if (error instanceof Error && error.name === "AbortError")
      throw new Error("Request timeout - please try again");
    throw error;
  }
}
