// Translation module.
// Runs a small quantized MT model client-side via transformers.js
// (Helsinki-NLP opus-mt-ja-en, ONNX) so translation works fully offline
// after the model is downloaded once and cached by the service worker.
//
// Quality is noticeably below a cloud API (DeepL/Google) — that's the
// accepted trade-off for zero-cost, fully offline operation.

export interface TranslationProgress {
  status: "downloading" | "ready" | "error";
  loadedBytes?: number;
  totalBytes?: number;
}

let pipelinePromise: Promise<unknown> | null = null;

async function getPipeline(_onProgress?: (p: TranslationProgress) => void) {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // TODO: const { pipeline } = await import("@xenova/transformers");
      // return pipeline("translation", "Xenova/opus-mt-ja-en");
      throw new Error("translation pipeline not yet wired up — scaffold only");
    })();
  }
  return pipelinePromise;
}

export async function translateSentence(_japanese: string): Promise<string> {
  await getPipeline();
  // TODO: run inference in a Web Worker, cache the result per sentence
  // (keyed by document id + sentence id) so re-opening a document never
  // re-runs the model.
  throw new Error("translateSentence() not yet implemented — scaffold only");
}
