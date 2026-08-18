// Dictionary lookup module.
// Offline word lookup backed by JMdict (a free, public-domain Japanese
// dictionary). Separate from the translation module: this answers
// "what does this one word mean" for the tap-word popover, while
// translation answers "what does this sentence mean".
//
// JMdict is distributed as a large XML file; the plan is to preprocess
// it at build time into a compact indexed format (e.g. sql.js or a
// flat JSON keyed by surface form) shipped under /public/dict/jmdict.

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
      // TODO: fetch("/dict/jmdict-index.json") and build the lookup map,
      // cached by the service worker for offline use.
      throw new Error("dictionary index not yet wired up — scaffold only");
    })();
  }
  return indexPromise;
}

export async function lookup(_surface: string): Promise<DictionaryEntry | null> {
  const index = await getIndex();
  return index.get(_surface) ?? null;
}
