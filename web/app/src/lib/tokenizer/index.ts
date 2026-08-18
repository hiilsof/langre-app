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

const KANJI = /[一-鿿々]/; // CJK ideographs + 々 iteration mark
const KATAKANA = /[ァ-ヶ]/g;

function katakanaToHiragana(text: string): string {
  return text.replace(KATAKANA, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// IPADIC's part-of-speech categories, translated for the UI (word popover,
// dictionary display). "名詞・代名詞" (noun-pronoun) is special-cased to
// "pronoun" since IPADIC doesn't give pronouns their own top-level tag.
const POS_LABELS: Record<string, string> = {
  "名詞": "noun",
  "動詞": "verb",
  "形容詞": "i-adjective",
  "形容動詞": "na-adjective",
  "副詞": "adverb",
  "助詞": "particle",
  "助動詞": "auxiliary verb",
  "連体詞": "adnominal",
  "接続詞": "conjunction",
  "感動詞": "interjection",
  "記号": "symbol",
  "フィラー": "filler",
  "接頭詞": "prefix",
  "その他": "other",
};

// Particles, auxiliary verbs, and symbols are grammar a learner is
// assumed to know very early, so they're treated as "common" for the
// Settings > Furigana > "Unknown words only" mode. This is a heuristic
// placeholder until real frequency/JLPT-level data is wired in via
// lib/dictionary — it doesn't yet know whether e.g. 見当 is rare.
const ALWAYS_COMMON_POS = new Set(["助詞", "助動詞", "記号", "フィラー"]);

function describePos(pos: string, posDetail1: string): string {
  if (pos === "名詞" && posDetail1 === "代名詞") return "pronoun";
  return POS_LABELS[pos] ?? pos;
}

function toToken(feature: kuromoji.IpadicFeatures): Token {
  const surface = feature.surface_form;
  // Unknown words (proper nouns, rare kanji not in IPADIC) have no
  // `reading` — falling back to the surface form avoids a crash, but it
  // isn't a real kana reading. TODO: fall back to lib/dictionary (JMdict)
  // once it's wired up, which covers many words IPADIC's reading field misses.
  const reading = feature.reading ? katakanaToHiragana(feature.reading) : surface;
  // basic_form is "*" when it's the same as the surface form (e.g. nouns,
  // particles) rather than repeating it.
  const lemma = feature.basic_form && feature.basic_form !== "*" ? feature.basic_form : surface;
  return {
    surface,
    lemma,
    reading,
    pos: describePos(feature.pos, feature.pos_detail_1),
    isKanji: KANJI.test(surface),
    isCommon: ALWAYS_COMMON_POS.has(feature.pos),
  };
}

export async function tokenize(text: string): Promise<Token[]> {
  const tokenizer = await getTokenizer();
  // Fine for single sentences/paragraphs. TODO: move onto a Web Worker
  // before running this over a full imported document, so parsing
  // doesn't block the UI thread.
  return tokenizer.tokenize(text).map(toToken);
}
