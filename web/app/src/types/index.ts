// Shared domain types used across modules.

export interface Token {
  surface: string;
  lemma: string; // dictionary/base form, e.g. "つく" for the inflected "つか" — this is the dictionary lookup key, not `surface`
  reading: string; // kana reading, e.g. "わがはい"
  pos: string; // part of speech, e.g. "noun", "particle"
  isKanji: boolean; // whether this token needs a furigana annotation
  isCommon: boolean; // frequency heuristic, used by "unknown words only" furigana mode
}

export interface Sentence {
  id: string;
  tokens: Token[];
  translation?: string; // populated lazily by the translation engine
}

export interface Document {
  id: string;
  title: string;
  titleEn?: string;
  tag: "novel" | "news" | "guide" | "other";
  sentences: Sentence[];
  progress: number; // 0-1, last reading position
  addedAt: number;
}

export type ReviewStage = "new" | "learning" | "known";

export interface VocabEntry {
  id: string;
  surface: string;
  reading: string;
  meaning: string;
  stage: ReviewStage;
  addedAt: number;
  dueAt: number;
}

export type FuriganaMode = "all" | "unknown" | "off";
export type TranslationMode = "tap" | "always";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  furigana: FuriganaMode;
  translation: TranslationMode;
  theme: Theme;
  voiceURI: string | null;
  ttsSpeed: number;
}
