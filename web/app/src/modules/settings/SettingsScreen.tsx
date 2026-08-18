// Settings module: reading preferences, TTS voice/speed, offline asset
// status, and theme. TODO: read/write via lib/storage (getSettings /
// saveSettings), and surface real download progress for the tokenizer
// dictionary, JMdict index, and translation model (currently static
// "Ready" placeholders in the UI prototype).

export function SettingsScreen() {
  return (
    <section>
      <h1>Settings</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Reading preferences, TTS voice/speed, offline asset status, and
        theme go here. See the UI prototype at{" "}
        <code>web/prototype/index.html</code> for the intended design.
      </p>
    </section>
  );
}
