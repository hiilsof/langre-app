// Library module: lists imported documents and their reading progress.
// TODO: read from lib/storage (listDocuments), wire the Import button to
// a .txt/.epub file picker that runs the text through lib/tokenizer
// before saving the resulting Document.

export function LibraryScreen() {
  return (
    <section>
      <h1>Library</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Document list, import flow, and reading progress go here. See the
        UI prototype at <code>web/prototype/index.html</code> for the
        intended design.
      </p>
    </section>
  );
}
