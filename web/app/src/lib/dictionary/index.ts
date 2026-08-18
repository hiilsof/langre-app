// Dictionary lookup module.
// Offline word lookup, separate from the translation module: this answers
// "what does this one word mean" for the tap-word popover (keyed by the
// tokenizer's `lemma`, i.e. dictionary form — "つく", not the inflected
// surface "つか"), while translation answers "what does this sentence mean".
//
// The real plan is JMdict (a free, public-domain Japanese dictionary,
// ~200k entries) preprocessed at build time into this same JSON shape.
// For now /public/dict/jmdict-mini.json is a small hand-curated set
// covering only the sample passage in the Reader screen, as a stand-in
// while the rest of the app is scaffolded — looking up a word outside
// that set correctly returns null rather than pretending to know it.

export interface DictionaryEntry {
  surface: string;
  reading: string;
  meanings: string[];
  pos: string;
}

let indexPromise: Promise<Map<string, DictionaryEntry>> | null = null;

async function getIndex(): Promise<Map<string, DictionaryEntry>> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const res = await fetch("/dict/jmdict-mini.json");
      if (!res.ok) throw new Error(`Failed to load dictionary index: ${res.status}`);
      const entries: DictionaryEntry[] = await res.json();
      return new Map(entries.map((entry) => [entry.surface, entry]));
    })();
  }
  return indexPromise;
}

export async function lookup(word: string): Promise<DictionaryEntry | null> {
  const index = await getIndex();
  return index.get(word) ?? null;
}
