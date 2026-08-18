import { useEffect, useRef, useState } from "react";
import { tokenize } from "../../lib/tokenizer";
import { lookup } from "../../lib/dictionary";
import type { Token } from "../../types";
import "./ReaderScreen.css";

// Reader module: the core document view — furigana-annotated text,
// tap-word dictionary lookup, tap-sentence translation, and TTS playback.
// Furigana rendering and word-tap (reading/POS/meaning) are implemented
// below. TODO: tap-sentence translation (needs lib/translation), TTS
// playback (needs lib/tts), and rendering a real multi-sentence Document
// instead of one fixed sample string. See web/prototype/index.html for
// the full intended design.

const SAMPLE_TEXT = "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。";

// undefined = still loading, null = looked up but no entry found
type Meaning = string[] | null | undefined;

interface PopoverState {
  token: Token;
  top: number;
  left: number;
  meaning: Meaning;
}

export function ReaderScreen() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFurigana, setShowFurigana] = useState(true);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    tokenize(SAMPLE_TEXT)
      .then((result) => { if (!cancelled) setTokens(result); })
      .catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, []);

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

  function openPopover(e: React.SyntheticEvent<HTMLElement>, token: Token) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - 256);
    let top = rect.bottom + 8;
    if (top + 160 > window.innerHeight) top = rect.top - 168;
    setPopover({ token, top, left, meaning: undefined });

    const seq = ++requestSeq.current;
    lookup(token.lemma).then((entry) => {
      if (requestSeq.current !== seq) return; // a different word was tapped meanwhile
      setPopover((current) => (current && current.token === token ? { ...current, meaning: entry?.meanings ?? null } : current));
    });
  }

  return (
    <section>
      <div className="reader-toolbar">
        <div className="reader-title">
          吾輩は猫である
          <small>I Am a Cat · Natsume Sōseki · opening lines</small>
        </div>
        <label className="furigana-switch">
          <input
            type="checkbox"
            checked={showFurigana}
            onChange={(e) => setShowFurigana(e.target.checked)}
          />
          Furigana
        </label>
      </div>

      {error && <p style={{ color: "#a5473a" }}>{error}</p>}
      {!tokens && !error && <p style={{ color: "var(--ink-faint)" }}>Tokenizing…</p>}

      {tokens && (
        <div
          ref={pageRef}
          className={"reader-page" + (showFurigana ? "" : " no-furigana")}
        >
          {tokens.map((t, i) => {
            const isSymbol = t.pos === "symbol";
            const isParticle = t.pos === "particle";
            const className =
              "tok" + (isParticle ? " is-particle" : "") + (isSymbol ? " is-symbol" : "");
            const content = t.isKanji ? (
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
        </div>
      )}
    </section>
  );
}
