import { useEffect, useRef, useState } from "react";
import { lookup } from "../../lib/dictionary";
import { getDocument, getSettings, saveDocument, saveSettings, saveVocabEntry } from "../../lib/storage";
import { speak, stop as ttsStop } from "../../lib/tts";
import { translateSentence, type TranslationProgress } from "../../lib/translation";
import type { Document, FuriganaMode, Sentence, Token, TranslationMode } from "../../types";
import "./ReaderScreen.css";

// Reader module: the core document view — furigana-annotated text,
// tap-word dictionary lookup (with save-to-vocabulary), TTS playback
// (word-level and whole-document, via lib/tts), and sentence translation
// (tap-to-reveal or always-shown, via lib/translation — results are
// written back onto Sentence.translation and persisted so a document
// isn't re-translated every time it's reopened). See
// web/prototype/index.html for the full intended design.

// undefined = still loading, null = looked up but no entry found
type Meaning = string[] | null | undefined;

interface PopoverState {
  token: Token;
  top: number;
  left: number;
  meaning: Meaning;
  saved: boolean;
  speaking: boolean;
}

interface ReaderScreenProps {
  documentId: string | null;
}

const FURIGANA_OPTIONS: { value: FuriganaMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unknown", label: "Unknown" },
  { value: "off", label: "Off" },
];

const TRANSLATION_OPTIONS: { value: TranslationMode; label: string }[] = [
  { value: "tap", label: "Tap" },
  { value: "always", label: "Always" },
];

export function ReaderScreen({ documentId }: ReaderScreenProps) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("all");
  const [translationMode, setTranslationMode] = useState<TranslationMode>("tap");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [translating, setTranslating] = useState<Record<string, TranslationProgress>>({});
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const playSession = useRef(0);
  const docRef = useRef<Document | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setFuriganaMode(s.furigana);
      setTranslationMode(s.translation);
    });
  }, []);

  useEffect(() => {
    setDoc(null);
    setError(null);
    setRevealed({});
    setTranslating({});
    if (!documentId) return;
    let cancelled = false;
    getDocument(documentId)
      .then((result) => {
        if (cancelled) return;
        if (!result) setError("Document not found.");
        else setDoc(result);
      })
      .catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [documentId]);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // "Always show" mode translates every untranslated sentence up front,
  // one at a time (the first call downloads the model; the rest reuse
  // it, so this doesn't parallelize many downloads).
  useEffect(() => {
    if (translationMode !== "always" || !doc) return;
    let cancelled = false;
    (async () => {
      for (const sentence of doc.sentences) {
        if (cancelled) return;
        const current = docRef.current?.sentences.find((s) => s.id === sentence.id);
        if (current && !current.translation) await translateSentenceNow(current);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationMode, doc?.id]);

  // Stop any in-progress playback when switching documents or leaving
  // the screen, so speech doesn't keep going after the text it's reading
  // is no longer on screen.
  useEffect(() => {
    return () => {
      playSession.current++;
      ttsStop();
    };
  }, [documentId]);

  useEffect(() => {
    if (!popover) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setPopover(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, [popover]);

  async function changeFuriganaMode(mode: FuriganaMode) {
    setFuriganaMode(mode);
    const settings = await getSettings();
    await saveSettings({ ...settings, furigana: mode });
  }

  async function changeTranslationMode(mode: TranslationMode) {
    setTranslationMode(mode);
    const settings = await getSettings();
    await saveSettings({ ...settings, translation: mode });
  }

  function toggleReveal(sentence: Sentence) {
    const willReveal = !revealed[sentence.id];
    setRevealed((r) => ({ ...r, [sentence.id]: willReveal }));
    if (willReveal && !sentence.translation) translateSentenceNow(sentence);
  }

  async function translateSentenceNow(sentence: Sentence) {
    if (sentence.translation || translating[sentence.id]) return;
    setTranslating((t) => ({ ...t, [sentence.id]: { status: "downloading", progress: 0 } }));
    let translated: string;
    try {
      const text = sentence.tokens.map((t) => t.surface).join("");
      translated = await translateSentence(text, (p) => {
        setTranslating((t) => ({ ...t, [sentence.id]: p }));
      });
    } catch {
      setTranslating((t) => ({ ...t, [sentence.id]: { status: "error" } }));
      return;
    }
    const current = docRef.current;
    if (current) {
      const updated: Document = {
        ...current,
        sentences: current.sentences.map((s) => (s.id === sentence.id ? { ...s, translation: translated } : s)),
      };
      docRef.current = updated;
      setDoc(updated);
      await saveDocument(updated);
    }
    setTranslating((t) => {
      const next = { ...t };
      delete next[sentence.id];
      return next;
    });
  }

  function openPopover(e: React.SyntheticEvent<HTMLElement>, token: Token) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - 256);
    let top = rect.bottom + 8;
    if (top + 180 > window.innerHeight) top = rect.top - 188;
    setPopover({ token, top, left, meaning: undefined, saved: false, speaking: false });

    const seq = ++requestSeq.current;
    lookup(token.lemma).then((entry) => {
      if (requestSeq.current !== seq) return; // a different word was tapped meanwhile
      setPopover((current) => (current && current.token === token ? { ...current, meaning: entry?.meanings ?? null } : current));
    });
  }

  async function saveWord(popoverState: PopoverState) {
    const { token, meaning } = popoverState;
    await saveVocabEntry({
      id: crypto.randomUUID(),
      surface: token.surface,
      reading: token.reading,
      meaning: Array.isArray(meaning) ? meaning.join("; ") : "",
      stage: "new",
      addedAt: Date.now(),
      dueAt: Date.now(),
    });
    setPopover((current) => (current ? { ...current, saved: true } : current));
  }

  async function playWord(token: Token) {
    setPopover((current) => (current && current.token === token ? { ...current, speaking: true } : current));
    const settings = await getSettings();
    try {
      await speak(token.surface, { voiceURI: settings.voiceURI, rate: settings.ttsSpeed });
    } catch {
      // Speech failed (e.g. no voices on this device) — nothing more to do,
      // the button just stops showing "Playing…".
    }
    setPopover((current) => (current && current.token === token ? { ...current, speaking: false } : current));
  }

  async function toggleDocumentPlayback() {
    if (isPlaying) {
      playSession.current++;
      ttsStop();
      setIsPlaying(false);
      setPlayingSentenceId(null);
      return;
    }
    if (!doc) return;
    const session = ++playSession.current;
    setIsPlaying(true);
    const settings = await getSettings();
    for (const sentence of doc.sentences) {
      if (playSession.current !== session) return; // stopped mid-queue
      setPlayingSentenceId(sentence.id);
      const text = sentence.tokens.map((t) => t.surface).join("");
      try {
        await speak(text, { voiceURI: settings.voiceURI, rate: settings.ttsSpeed });
      } catch {
        break; // a real failure, not a stop() — give up rather than loop on it
      }
    }
    if (playSession.current === session) {
      setIsPlaying(false);
      setPlayingSentenceId(null);
    }
  }

  const showRt = (t: Token) =>
    furiganaMode === "all" ? true : furiganaMode === "off" ? false : !t.isCommon;

  return (
    <section>
      <div className="reader-toolbar">
        <div className="reader-title">
          {doc?.title ?? (documentId ? "" : "No document selected")}
          {doc?.titleEn && <small>{doc.titleEn}</small>}
        </div>
        <div className="toolbar-controls">
          <div className="toolbar-group">
            <span>Furigana</span>
            <div className="pill-group">
              {FURIGANA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={furiganaMode === opt.value ? "active" : ""}
                  onClick={() => changeFuriganaMode(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-group">
            <span>Translation</span>
            <div className="pill-group">
              {TRANSLATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={translationMode === opt.value ? "active" : ""}
                  onClick={() => changeTranslationMode(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p style={{ color: "#a5473a" }}>{error}</p>}
      {!documentId && !error && (
        <p style={{ color: "var(--ink-faint)" }}>Choose a document from the Library to start reading.</p>
      )}
      {documentId && !doc && !error && <p style={{ color: "var(--ink-faint)" }}>Loading…</p>}

      {doc && (
        <div className="reader-page">
          {doc.sentences.map((sentence) => (
            <span
              key={sentence.id}
              className={"sent" + (playingSentenceId === sentence.id ? " is-reading" : "")}
            >
              {sentence.tokens.map((t, i) => {
                const isSymbol = t.pos === "symbol";
                const isParticle = t.pos === "particle";
                const className =
                  "tok" + (isParticle ? " is-particle" : "") + (isSymbol ? " is-symbol" : "");
                const content = t.isKanji && showRt(t) ? (
                  <ruby>
                    {t.surface}
                    <rt>{t.reading}</rt>
                  </ruby>
                ) : (
                  t.surface
                );

                if (isSymbol) {
                  return <span key={i}>{content}</span>;
                }

                return (
                  <span
                    key={i}
                    className={className}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => openPopover(e, t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPopover(e, t);
                      }
                    }}
                  >
                    {content}
                  </span>
                );
              })}
              {translationMode === "tap" && (
                <button
                  className="translate-btn"
                  aria-pressed={!!revealed[sentence.id]}
                  onClick={() => toggleReveal(sentence)}
                >
                  EN
                </button>
              )}
              {(translationMode === "always" || revealed[sentence.id]) && (
                <span
                  className="translation"
                  onClick={() => {
                    if (translating[sentence.id]?.status === "error") translateSentenceNow(sentence);
                  }}
                >
                  {sentence.translation
                    ? sentence.translation
                    : translating[sentence.id]?.status === "downloading"
                      ? `Downloading translation model… ${Math.round((translating[sentence.id]?.progress ?? 0) * 100)}%`
                      : translating[sentence.id]?.status === "error"
                        ? "Translation failed — tap to retry."
                        : "Translating…"}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {doc && (
        <div className="tts-bar">
          <button className="tts-play" onClick={toggleDocumentPlayback} aria-label={isPlaying ? "Stop reading" : "Read document aloud"}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z" /></svg>
            )}
          </button>
          <span className="tts-status">
            {isPlaying
              ? playingSentenceId
                ? `Reading sentence ${doc.sentences.findIndex((s) => s.id === playingSentenceId) + 1} of ${doc.sentences.length}`
                : "Starting…"
              : "Read document aloud"}
          </span>
        </div>
      )}

      {popover && (
        <div
          className="word-popover"
          style={{ top: popover.top, left: popover.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="wp-head">
            <div className="wp-reading">{popover.token.reading}</div>
            <button
              className="wp-listen"
              disabled={popover.speaking}
              onClick={() => playWord(popover.token)}
              aria-label="Play word"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9v6h4l5 4V5L8 9z" />
                <path d="M16 9a4 4 0 0 1 0 6" />
              </svg>
            </button>
          </div>
          <div className="wp-pos">{popover.token.pos}</div>
          {popover.meaning === undefined && <div className="wp-meaning wp-meaning--loading">Looking up…</div>}
          {popover.meaning === null && <div className="wp-meaning wp-meaning--empty">No dictionary entry yet</div>}
          {Array.isArray(popover.meaning) && (
            <ul className="wp-meaning">
              {popover.meaning.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
          {popover.meaning !== undefined && (
            <button
              className="wp-save"
              disabled={popover.saved}
              onClick={() => saveWord(popover)}
            >
              {popover.saved ? "Saved ✓" : "+ Save to vocabulary"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
