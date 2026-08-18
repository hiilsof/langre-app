import { useEffect, useRef, useState } from "react";
import { tokenize } from "../../lib/tokenizer";
import type { Token } from "../../types";
import "./ReaderScreen.css";

// Reader module: the core document view — furigana-annotated text,
// tap-word dictionary lookup, tap-sentence translation, and TTS playback.
// Furigana rendering and word-tap (reading/POS only, from the tokenizer
// itself) are implemented below. TODO: tap-sentence translation (needs
// lib/translation), meanings in the word popover (needs lib/dictionary),
// TTS playback (needs lib/tts), and rendering a real multi-sentence
// Document instead of one fixed sample string. See web/prototype/index.html
// for the full intended design.

const SAMPLE_TEXT = "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。";

interface PopoverState {
  token: Token;
  top: number;
  left: number;
}

export function ReaderScreen() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFurigana, setShowFurigana] = useState(true);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - 216);
    let top = rect.bottom + 8;
    if (top + 100 > window.innerHeight) top = rect.top - 108;
    setPopover({ token, top, left });
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
        </div>
      )}
    </section>
  );
}
