// Document ingestion module (minimal slice).
// Turns raw pasted Japanese text into a stored Document: split into
// sentences, each tokenized via lib/tokenizer. This is the "paste text"
// path; real file import (.txt/.epub) is a separate follow-up — the
// Library screen's Import form only takes pasted text for now.

import { tokenize } from "../tokenizer";
import type { Document, Sentence } from "../../types";

// Splits on Japanese sentence-ending punctuation, keeping the punctuation
// as part of the preceding sentence. Good enough for plain prose; doesn't
// handle quoted dialogue spanning the punctuation, ellipses, etc.
function splitIntoSentenceTexts(text: string): string[] {
  const matches = text.match(/[^。！？\n]+[。！？]?/g) ?? [];
  return matches.map((s) => s.trim()).filter(Boolean);
}

export interface CreateDocumentInput {
  title: string;
  titleEn?: string;
  tag: Document["tag"];
  text: string;
}

export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  const sentenceTexts = splitIntoSentenceTexts(input.text);
  const sentences: Sentence[] = [];
  for (const text of sentenceTexts) {
    sentences.push({ id: crypto.randomUUID(), tokens: await tokenize(text) });
  }
  return {
    id: crypto.randomUUID(),
    title: input.title,
    titleEn: input.titleEn,
    tag: input.tag,
    sentences,
    progress: 0,
    addedAt: Date.now(),
  };
}
