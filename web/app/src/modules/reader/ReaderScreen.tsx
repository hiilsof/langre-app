import { useEffect, useRef, useState } from "react";
import { lookup } from "../../lib/dictionary";
import { getDocument, getSettings, saveSettings, saveVocabEntry } from "../../lib/storage";
import type { Document, FuriganaMode, Token } from "../../types";
import "./ReaderScreen.css";

// Reader module: the core document view — furigana-annotated text,
// tap-word dictionary lookup (with save-to-vocabulary), and TTS playback.
// TODO: tap-sentence translation (needs lib/translation), TTS playback
// (needs lib/tts). See web/prototype/index.html for the full intended
// design.

// undefined = still loading, null = looked up but no entry found
type Meaning = string[] | null | undefined;

interface PopoverState {
  token: Token;
  top: number;
  left: number;
  meaning: Meaning;
  saved: boolean;
}

interface ReaderScreenProps {
  documentId: string | null;
}

const FURIGANA_OPTIONS: { value: FuriganaMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unknown", label: "Unknown" },
  { value: "off", label: "Off" },
];

export function ReaderScreen({ documentId }: ReaderScreenProps) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("all");
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    getSettings().then((s) => setFuriganaMode(s.furigana));
  }, []);

  useEffect(() => {
    setDoc(null);
    setError(null);
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

  function openPopover(e: React.SyntheticEvent<HTMLElement>, token: Token) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - 256);
    let top = rect.bottom + 8;
    if (top + 180 > window.innerHeight) top = rect.top - 188;
    setPopover({ token, top, left, meaning: undefined, saved: false });

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

  const showRt = (t: Token) =>
    furiganaMode === "all" ? true : furiganaMode === "off" ? false : !t.isCommon;

  return (
    <section>
      <div className="reader-toolbar">
        <div className="reader-title">
          {doc?.title ?? (documentId ? "" : "No document selected")}
          {doc?.titleEn && <small>{doc.titleEn}</small>}
        </div>
        <div className="furigana-group">
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
      </div>

      {error && <p style={{ color: "#a5473a" }}>{error}</p>}
      {!documentId && !error && (
        <p style={{ color: "var(--ink-faint)" }}>Choose a document from the Library to start reading.</p>
      )}
      {documentId && !doc && !error && <p style={{ color: "var(--ink-faint)" }}>Loading…</p>}

      {doc && (
        <div className="reader-page">
          {doc.sentences.map((sentence) =>
            sentence.tokens.map((t, i) => {
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
                return <span key={sentence.id + i}>{content}</span>;
              }

              return (
                <span
                  key={sentence.id + i}
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
            })
          )}
        </div>
      )}

      {popover && (
        <div
          className="word-popover"
          style={{ top: popover.top, left: popover.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="wp-reading">{popover.token.reading}</div>
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
