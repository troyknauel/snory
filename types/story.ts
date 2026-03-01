export type Speaker = "Narrator" | "Girl" | "Boy" | "Dragon" | "Wizard" | "Moral" | "Character" | string;

export interface CharacterVoiceSpec {
  gender: "male" | "female" | "neutral";
  age: "child" | "teen" | "adult" | "elderly";
  accent?: string;
  tone?: string;
  pace?: string;
}

export interface StoryLine {
  speaker: string;
  text: string;
  characterName?: string;
  characterDescription?: string;
  voiceSpec?: CharacterVoiceSpec;
}

export interface Story {
  id: string;
  lines: StoryLine[];
  prompt: string;
  language: "en" | "es";
  createdAt: number;
  audioGenerated: boolean;
  isFavorite?: boolean;
  ambience?: string;
}

export interface AudioLine extends StoryLine {
  audioUrl?: string;
  isPlaying?: boolean;
}
