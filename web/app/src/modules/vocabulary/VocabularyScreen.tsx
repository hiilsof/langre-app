import { useEffect, useState } from "react";
import { listVocab } from "../../lib/storage";
import type { VocabEntry } from "../../types";

// Vocabulary module: saved words, read from storage. "Start review" is
// still a placeholder — real spaced-repetition scheduling (e.g. SM-2)
// is a separate follow-up; this screen only computes how many entries
// are already past their dueAt.

const STAGE_LABEL: Record<VocabEntry["stage"], string> = {
  new: "New",
  learning: "Learning",
  known: "Known",
};

export function VocabularyScreen() {
  const [entries, setEntries] = useState<VocabEntry[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    listVocab().then((list) => {
      list.sort((a, b) => b.addedAt - a.addedAt);
      setEntries(list);
    });
  }, []);

  const dueCount = entries?.filter((e) => e.dueAt <= Date.now()).length ?? 0;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <section>
      <h1>Vocabulary</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          background: "var(--accent-soft)",
          borderRadius: 16,
          padding: "16px 22px",
          margin: "20px 0",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--accent-deep)" }}>
            {dueCount}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>word{dueCount === 1 ? "" : "s"} due for review</div>
        </div>
        <button
          onClick={() => showToast("Review session — spaced-repetition scheduling isn't wired up yet.")}
          disabled={dueCount === 0}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "9px 18px",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: dueCount === 0 ? "default" : "pointer",
            opacity: dueCount === 0 ? 0.6 : 1,
            font: "inherit",
          }}
        >
          Start review
        </button>
      </div>

      {entries && entries.length === 0 && (
        <p style={{ color: "var(--ink-faint)" }}>
          No saved words yet — tap a word in the Reader and hit "Save to vocabulary".
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries?.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 18px",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", width: 100, flexShrink: 0 }}>
              {entry.surface}
            </span>
            <span style={{ color: "var(--ink-faint)", fontSize: "0.8rem", width: 90, flexShrink: 0 }}>
              {entry.reading}
            </span>
            <span style={{ flex: 1, color: "var(--ink-soft)", fontSize: "0.9rem" }}>
              {entry.meaning || <em style={{ color: "var(--ink-faint)" }}>no meaning saved</em>}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "3px 10px",
                borderRadius: 999,
                background: entry.stage === "known" ? "var(--success-soft)" : entry.stage === "learning" ? "var(--amber-soft)" : "var(--accent-soft)",
                color: entry.stage === "known" ? "var(--success)" : entry.stage === "learning" ? "var(--amber)" : "var(--accent-deep)",
                flexShrink: 0,
              }}
            >
              {STAGE_LABEL[entry.stage]}
            </span>
          </div>
        ))}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 28,
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "var(--paper)",
            padding: "11px 20px",
            borderRadius: 999,
            fontSize: "0.85rem",
          }}
        >
          {toast}
        </div>
      )}
    </section>
  );
}
