// Translation module.
// Runs a small quantized MT model client-side via transformers.js
// (Helsinki-NLP opus-mt-ja-en, ONNX) so translation works fully offline
// after the model is downloaded once — transformers.js caches the model
// files in the browser's Cache Storage itself, independent of the PWA's
// own service worker precache.
//
// Quality is noticeably below a cloud API (DeepL/Google) — that's the
// accepted trade-off for zero-cost, fully offline operation.
//
// This sandbox's network policy blocks huggingface.co (where the model
// is hosted), so actual download/inference couldn't be exercised in
// this environment. The pipeline construction and caching logic below
// is verified via a mocked pipeline (see the Reader screen's
// translation wiring); real output quality needs testing on a real
// device with normal network access.

export interface TranslationProgress {
  status: "downloading" | "ready" | "error";
  progress?: number; // 0-1, only meaningful while status === "downloading"
}

type Translator = (text: string) => Promise<string>;

let pipelinePromise: Promise<Translator> | null = null;

function getPipeline(onProgress?: (p: TranslationProgress) => void): Promise<Translator> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const translator = await pipeline("translation", "Xenova/opus-mt-ja-en", {
        progress_callback: (info: { status: string; progress?: number }) => {
          if (!onProgress) return;
          if (info.status === "progress") {
            onProgress({ status: "downloading", progress: (info.progress ?? 0) / 100 });
          } else if (info.status === "ready" || info.status === "done") {
            onProgress({ status: "ready" });
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
  onProgress?: (p: TranslationProgress) => void
): Promise<string> {
  const cached = memoCache.get(japanese);
  if (cached !== undefined) return cached;
  const translate = await getPipeline(onProgress);
  const result = await translate(japanese);
  memoCache.set(japanese, result);
  return result;
}
