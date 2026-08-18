import { useEffect, useState } from "react";
import { getDocument, listDocuments, saveDocument } from "../../lib/storage";
import { createDocument } from "../../lib/documents";
import type { Document } from "../../types";

// Library module: lists imported documents and their reading progress.
// Import currently only accepts pasted text — a real .txt/.epub file
// picker is a separate follow-up (see lib/documents for where that
// would plug in).

const TAGS: Document["tag"][] = ["novel", "news", "guide", "other"];

// New installs are seeded with one sample document so the Library isn't
// empty on first run and there's something real (storage-backed) to open
// in the Reader right away. Fixed id (rather than checking "any documents
// exist") makes this idempotent — safe even if the effect runs twice
// (React StrictMode double-invokes effects in dev), since it's a keyed
// upsert rather than an unconditional insert.
const SEED_DOC_ID = "seed-wagahai";
const SEED_TEXT = "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。";

interface LibraryScreenProps {
  onOpenDocument: (id: string) => void;
}

export function LibraryScreen({ onOpenDocument }: LibraryScreenProps) {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<Document["tag"]>("other");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const docs = await listDocuments();
    docs.sort((a, b) => b.addedAt - a.addedAt);
    setDocuments(docs);
  }

  useEffect(() => {
    (async () => {
      const existing = await getDocument(SEED_DOC_ID);
      if (!existing) {
        const seedDoc = await createDocument({
          title: "吾輩は猫である",
          titleEn: "I Am a Cat — Natsume Sōseki, opening lines",
          tag: "novel",
          text: SEED_TEXT,
        });
        seedDoc.id = SEED_DOC_ID;
        await saveDocument(seedDoc);
      }
      await refresh();
    })();
  }, []);

  async function handleAdd() {
    if (!title.trim() || !text.trim()) return;
    setSaving(true);
    try {
      const doc = await createDocument({ title: title.trim(), tag, text });
      await saveDocument(doc);
      setTitle("");
      setText("");
      setTag("other");
      setShowForm(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <div>
          <h1>Library</h1>
          <p style={{ color: "var(--ink-faint)", fontSize: "0.9rem", margin: "4px 0 0" }}>
            {documents ? `${documents.length} document${documents.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "9px 18px",
            fontSize: "0.88rem",
            fontWeight: 700,
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {showForm ? "Cancel" : "+ Import text"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            marginTop: 20,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 560,
          }}
        >
          <p style={{ margin: 0, color: "var(--ink-faint)", fontSize: "0.82rem" }}>
            Paste Japanese text below. It'll be tokenized and saved for offline reading.
            File import (.txt/.epub) isn't wired up yet.
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={inputStyle}
          />
          <select value={tag} onChange={(e) => setTag(e.target.value as Document["tag"])} style={inputStyle}>
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="日本語のテキストをここに貼り付けてください。"
            rows={6}
            style={{ ...inputStyle, fontFamily: "var(--font-display)", fontSize: "1rem", resize: "vertical" }}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !title.trim() || !text.trim()}
            style={{
              alignSelf: "flex-start",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "9px 18px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
              opacity: saving || !title.trim() || !text.trim() ? 0.6 : 1,
              font: "inherit",
            }}
          >
            {saving ? "Tokenizing…" : "Add to library"}
          </button>
        </div>
      )}

      {documents && documents.length === 0 && !showForm && (
        <p style={{ color: "var(--ink-faint)", marginTop: 24 }}>
          No documents yet — import some text to get started.
        </p>
      )}

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {documents?.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onOpenDocument(doc.id)}
            style={{
              textAlign: "left",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 18,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              font: "inherit",
              color: "inherit",
            }}
          >
            <span
              style={{
                alignSelf: "flex-start",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "var(--amber-soft)",
                color: "var(--amber)",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              {doc.tag}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>{doc.title}</span>
            {doc.titleEn && <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>{doc.titleEn}</span>}
            <span style={{ fontSize: "0.78rem", color: "var(--ink-faint)", marginTop: "auto" }}>
              {doc.sentences.length} sentence{doc.sentences.length === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  font: "inherit",
  fontSize: "0.9rem",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--paper)",
  color: "var(--ink)",
};
