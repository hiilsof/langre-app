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

export async function saveDocument(doc: Document): Promise<void> {
  await (await getDB()).put("documents", doc);
}

export async function listVocab(): Promise<VocabEntry[]> {
  return (await getDB()).getAll("vocab");
}

export async function saveVocabEntry(entry: VocabEntry): Promise<void> {
  await (await getDB()).put("vocab", entry);
}

export async function getSettings(): Promise<Settings | undefined> {
  return (await getDB()).get("settings", "settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await getDB()).put("settings", settings, "settings");
}
