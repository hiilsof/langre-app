import { useEffect, useState } from "react";
import { tokenize } from "../../lib/tokenizer";
import type { Token } from "../../types";

// Reader module: the core document view — furigana-annotated text,
// tap-word dictionary lookup, tap-sentence translation, and TTS playback.
// TODO: render full Document.sentences with <ruby> tags, wire word taps
// to lib/dictionary, sentence taps to lib/translation, and a playback
// bar to lib/tts. For now this runs the real tokenizer on a fixed
// sentence as a smoke test — see web/prototype/index.html for the
// intended final design.

const SAMPLE_TEXT = "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。";

export function ReaderScreen() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    tokenize(SAMPLE_TEXT)
      .then((result) => { if (!cancelled) setTokens(result); })
      .catch((err) => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section>
      <h1>Reader</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Tokenizer smoke test — real furigana rendering, tap-to-translate,
        and TTS playback still need to be wired up.
      </p>

      {error && <p style={{ color: "#a5473a" }}>{error}</p>}
      {!tokens && !error && <p>Tokenizing…</p>}

      {tokens && (
        <table style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--ink-faint)" }}>
              <th style={{ padding: "4px 16px 4px 0" }}>Surface</th>
              <th style={{ padding: "4px 16px 4px 0" }}>Reading</th>
              <th style={{ padding: "4px 16px 4px 0" }}>POS</th>
              <th style={{ padding: "4px 16px 4px 0" }}>Kanji?</th>
              <th style={{ padding: "4px 16px 4px 0" }}>Common?</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "4px 16px 4px 0", fontFamily: "var(--font-display)" }}>{t.surface}</td>
                <td style={{ padding: "4px 16px 4px 0" }}>{t.reading}</td>
                <td style={{ padding: "4px 16px 4px 0" }}>{t.pos}</td>
                <td style={{ padding: "4px 16px 4px 0" }}>{t.isKanji ? "yes" : ""}</td>
                <td style={{ padding: "4px 16px 4px 0" }}>{t.isCommon ? "yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
