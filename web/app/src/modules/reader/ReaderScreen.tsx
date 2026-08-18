// Reader module: the core document view — furigana-annotated text,
// tap-word dictionary lookup, tap-sentence translation, and TTS playback.
// TODO: render Document.sentences as <ruby> tags per Token, wire word
// taps to lib/dictionary, sentence taps to lib/translation, and the
// playback bar to lib/tts.

export function ReaderScreen() {
  return (
    <section>
      <h1>Reader</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Furigana rendering, tap-to-translate, and TTS playback go here.
        See the UI prototype at <code>web/prototype/index.html</code> for
        the intended design.
      </p>
    </section>
  );
}
