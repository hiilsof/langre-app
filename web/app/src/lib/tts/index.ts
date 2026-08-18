// Text-to-speech module.
// Wraps the browser's built-in Web Speech API (speechSynthesis), which
// calls the OS's local voices — free and offline by nature. This module
// only speaks a single string; word/sentence/document-level playback and
// queueing live in the Reader screen, which is the thing that knows
// about sentence boundaries and needs to drive UI state (play/pause,
// which sentence is highlighted) alongside it.

export interface TtsOptions {
  voiceURI?: string | null;
  rate?: number; // 0.5 - 2, matches the Settings speed slider
}

export function isSupported(): boolean {
  return "speechSynthesis" in window;
}

export function listVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

// Voices load asynchronously in most browsers (fired via `onvoiceschanged`)
// rather than being available immediately. Resolves once the list is
// populated, or after a short timeout if the browser/environment never
// reports any (e.g. a headless container with no OS speech engine).
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;
export function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  if (!voicesReadyPromise) {
    voicesReadyPromise = new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        resolve([]);
        return;
      }
      const existing = synth.getVoices();
      if (existing.length > 0) {
        resolve(existing);
        return;
      }
      synth.onvoiceschanged = () => resolve(synth.getVoices());
      setTimeout(() => resolve(synth.getVoices()), 1000);
    });
  }
  return voicesReadyPromise;
}

// Speaks one string to completion. Resolves on natural completion *and*
// on a deliberate stop() (cancellation reports as an "interrupted" or
// "canceled" error event, not "end" — callers driving a playback queue
// need that to look like a clean stop, not a failure to react to).
export function speak(text: string, options: TtsOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      reject(new Error("Speech synthesis isn't supported in this browser."));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    if (options.rate) utterance.rate = options.rate;
    if (options.voiceURI) {
      const voice = synth.getVoices().find((v) => v.voiceURI === options.voiceURI);
      if (voice) utterance.voice = voice;
    }
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") resolve();
      else reject(new Error(e.error || "Speech synthesis failed"));
    };
    synth.speak(utterance);
  });
}

export function stop(): void {
  window.speechSynthesis?.cancel();
}
