// Morphological analysis module.
// Wraps kuromoji.js (a pure-JS MeCab port) to tokenize Japanese text into
// words with kana readings and part-of-speech tags, entirely offline.
//
// kuromoji ships its dictionary as data files that must be fetched once
// (copied from node_modules/kuromoji/dict into /public/dict at build time)
// and are then cached by the service worker for offline use.

import kuromoji from "kuromoji";
import type { Token } from "../../types";

type KuromojiTokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

function getTokenizer(): Promise<KuromojiTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: "/dict" }).build((err, tokenizer) => {
        if (err) reject(err);
        else resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

export async function tokenize(_text: string): Promise<Token[]> {
  await getTokenizer();
  // TODO: run this in a Web Worker so parsing a full document doesn't
  // block the UI thread; map kuromoji's IpadicFeatures (surface_form,
  // reading, pos) into our Token shape.
  throw new Error("tokenize() not yet implemented — scaffold only");
}
