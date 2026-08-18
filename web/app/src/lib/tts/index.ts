// Text-to-speech module.
// Wraps the browser's built-in Web Speech API (speechSynthesis), which
// calls the OS's local voices — free and offline by nature. Supports
// word-level, sentence-level, and full-document (queued) playback.

export interface TtsOptions {
  voiceURI?: string | null;
  rate?: number; // 0.75 - 1.5, matches the Settings speed slider
}

export function listVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

export function speak(_text: string, _options: TtsOptions = {}): Promise<void> {
  // TODO: build a SpeechSynthesisUtterance, resolve the promise on the
  // "end" event, reject on "error". For full-document playback, queue
  // one utterance per sentence and emit a callback per boundary so the
  // reader view can highlight the active sentence in sync.
  throw new Error("speak() not yet implemented — scaffold only");
}

export function stop(): void {
  window.speechSynthesis?.cancel();
}
