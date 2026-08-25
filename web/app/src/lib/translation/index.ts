// Translation module.
// Runs a small quantized MT model client-side via transformers.js
// (Helsinki-NLP opus-mt-ja-en, ONNX) so translation works fully offline
// after the model is downloaded once — transformers.js caches the model
// files in the browser's Cache Storage itself, independent of the PWA's
// own service worker precache.
//
// Quality is noticeably below a cloud API (DeepL/Google) — that's the
// accepted trade-off for zero-cost, fully offline operation.

export interface TranslationProgress {
  status: "downloading" | "ready" | "error";
  progress?: number; // 0-1, only meaningful while status === "downloading"
}

type Translator = (text: string) => Promise<string>;
type ProgressListener = (p: TranslationProgress) => void;

// Model loading is a single shared, memoized promise (only ever download
// the ~80MB model once), but multiple sentences can start translating
// concurrently (e.g. "Always show" mode, or several quick taps) — every
// caller in flight while the model is still loading needs to see the
// same progress events, not just whichever call happened to be first to
// trigger the load. Hence a listener set that every in-flight call
// registers into, rather than a single callback captured once.
const progressListeners = new Set<ProgressListener>();

function broadcastProgress(p: TranslationProgress) {
  progressListeners.forEach((fn) => fn(p));
}

let pipelinePromise: Promise<Translator> | null = null;

function getPipeline(): Promise<Translator> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const translator = await pipeline("translation", "Xenova/opus-mt-ja-en", {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (info.status === "progress") {
            broadcastProgress({ status: "downloading", progress: (info.progress ?? 0) / 100 });
          } else if (info.status === "ready" || info.status === "done") {
            broadcastProgress({ status: "ready" });
          }
        },
      });
      return async (text: string) => {
        const output = await translator(text, { max_new_tokens: 128 });
        return output[0].translation_text;
      };
    })();
  }
  return pipelinePromise;
}

// Sentence-level memo cache so re-translating the same text within a
// session (e.g. re-opening a document) doesn't re-run the model. Longer-
// term persistence (surviving a reload) is the caller's job — the Reader
// screen writes results onto Sentence.translation and saves the Document.
const memoCache = new Map<string, string>();

export async function translateSentence(
  japanese: string,
  onProgress?: ProgressListener
): Promise<string> {
  const cached = memoCache.get(japanese);
  if (cached !== undefined) return cached;
  if (onProgress) progressListeners.add(onProgress);
  try {
    const translate = await getPipeline();
    const result = await translate(japanese);
    memoCache.set(japanese, result);
    return result;
  } finally {
    if (onProgress) progressListeners.delete(onProgress);
  }
}
