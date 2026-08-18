// Vocabulary module: saved words and spaced-repetition review.
// TODO: read from lib/storage (listVocab), sort by dueAt for the review
// queue, implement a basic SRS scheduling function (e.g. SM-2).

export function VocabularyScreen() {
  return (
    <section>
      <h1>Vocabulary</h1>
      <p style={{ color: "var(--ink-faint)" }}>
        Saved-word list and spaced-repetition review go here. See the UI
        prototype at <code>web/prototype/index.html</code> for the
        intended design.
      </p>
    </section>
  );
}
