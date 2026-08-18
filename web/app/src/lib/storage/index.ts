// Offline storage module.
// IndexedDB (via the `idb` helper) for documents, vocabulary, and
// settings — everything the app needs to work with no network at all.
// Model/dictionary asset caching itself is handled separately by the
// service worker (see vite-plugin-pwa config in vite.config.ts).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Document, VocabEntry, Settings } from "../../types";

interface LangreDB extends DBSchema {
  documents: { key: string; value: Document };
  vocab: { key: string; value: VocabEntry; indexes: { "by-dueAt": number } };
  settings: { key: "settings"; value: Settings };
}

let dbPromise: Promise<IDBPDatabase<LangreDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LangreDB>("langre", 1, {
      upgrade(db) {
        db.createObjectStore("documents", { keyPath: "id" });
        const vocab = db.createObjectStore("vocab", { keyPath: "id" });
        vocab.createIndex("by-dueAt", "dueAt");
        db.createObjectStore("settings");
      },
    });
  }
  return dbPromise;
}

export async function listDocuments(): Promise<Document[]> {
  return (await getDB()).getAll("documents");
}

export async function getDocument(id: string): Promise<Document | undefined> {
  return (await getDB()).get("documents", id);
}

export async function saveDocument(doc: Document): Promise<void> {
  await (await getDB()).put("documents", doc);
}

export async function listVocab(): Promise<VocabEntry[]> {
  return (await getDB()).getAll("vocab");
}

export async function saveVocabEntry(entry: VocabEntry): Promise<void> {
  await (await getDB()).put("vocab", entry);
}

export const DEFAULT_SETTINGS: Settings = {
  furigana: "all",
  translation: "tap",
  theme: "system",
  voiceURI: null,
  ttsSpeed: 1,
};

// Settings are stored sparsely (only the fields a screen has touched), so
// callers always get a complete object back with defaults filled in.
export async function getSettings(): Promise<Settings> {
  const stored = await (await getDB()).get("settings", "settings");
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await getDB()).put("settings", settings, "settings");
}
