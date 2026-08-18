import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../../lib/storage";
import { voicesReady } from "../../lib/tts";
import type { FuriganaMode, Theme } from "../../types";

// Settings module. Furigana mode, theme, and TTS voice/speed are real
// and persisted. Translation display mode and offline-asset status
// aren't here yet — those depend on lib/translation, which is still a
// stub.

interface SettingsScreenProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const FURIGANA_OPTIONS: { value: FuriganaMode; label: string; hint: string }[] = [
  { value: "all", label: "All words", hint: "Show readings above every kanji word" },
  { value: "unknown", label: "Unknown only", hint: "Hide readings for words already marked common" },
  { value: "off", label: "Off", hint: "No readings shown" },
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsScreen({ theme, onThemeChange }: SettingsScreenProps) {
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode | null>(null);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[] | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setFuriganaMode(s.furigana);
      setVoiceURI(s.voiceURI);
      setTtsSpeed(s.ttsSpeed);
    });
    voicesReady().then((list) => setVoices(list.filter((v) => v.lang.startsWith("ja"))));
  }, []);

  async function changeFurigana(mode: FuriganaMode) {
    setFuriganaMode(mode);
    const settings = await getSettings();
    await saveSettings({ ...settings, furigana: mode });
  }

  async function changeVoice(uri: string) {
    setVoiceURI(uri || null);
    const settings = await getSettings();
    await saveSettings({ ...settings, voiceURI: uri || null });
  }

  async function changeSpeed(speed: number) {
    setTtsSpeed(speed);
    const settings = await getSettings();
    await saveSettings({ ...settings, ttsSpeed: speed });
  }

  return (
    <section style={{ maxWidth: 560 }}>
      <h1>Settings</h1>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Reading</h2>
        <p style={{ color: "var(--ink-faint)", fontSize: "0.82rem", margin: "4px 0 16px" }}>
          Controls how furigana appears in the Reader — the same setting either screen changes.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FURIGANA_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="radio"
                name="furigana"
                checked={furiganaMode === opt.value}
                onChange={() => changeFurigana(opt.value)}
                style={{ marginTop: 3, accentColor: "var(--accent)" }}
              />
              <span>
                <div style={{ fontSize: "0.9rem" }}>{opt.label}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-faint)" }}>{opt.hint}</div>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Appearance</h2>
        <p style={{ color: "var(--ink-faint)", fontSize: "0.82rem", margin: "4px 0 16px" }}>Theme</p>
        <div style={{ display: "flex", gap: 2, background: "var(--paper)", borderRadius: 999, padding: 2, width: "fit-content" }}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onThemeChange(opt.value)}
              style={{
                border: "none",
                font: "inherit",
                fontSize: "0.82rem",
                padding: "7px 16px",
                borderRadius: 999,
                cursor: "pointer",
                background: theme === opt.value ? "var(--surface)" : "transparent",
                color: theme === opt.value ? "var(--accent-deep)" : "var(--ink-soft)",
                fontWeight: theme === opt.value ? 700 : 400,
                boxShadow: theme === opt.value ? "0 1px 2px rgba(27,33,41,.1)" : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Text-to-speech</h2>
        <p style={{ color: "var(--ink-faint)", fontSize: "0.82rem", margin: "4px 0 16px" }}>
          Uses your device's built-in speech voices — nothing is uploaded.
        </p>

        {voices === null && <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>Checking available voices…</p>}
        {voices?.length === 0 && (
          <p style={{ color: "var(--ink-faint)", fontSize: "0.85rem" }}>
            No Japanese voices found on this device. Check your OS's language/speech settings to
            install one — Windows and macOS both ship one, but it may need enabling.
          </p>
        )}
        {voices && voices.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.9rem" }}>Voice</span>
              <select
                value={voiceURI ?? ""}
                onChange={(e) => changeVoice(e.target.value)}
                style={{
                  font: "inherit",
                  fontSize: "0.85rem",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  width: "fit-content",
                }}
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.9rem" }}>Speed — {ttsSpeed.toFixed(2)}×</span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.25}
                value={ttsSpeed}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                style={{ accentColor: "var(--accent)", width: 200 }}
              />
            </label>
          </div>
        )}
      </div>

      <p style={{ color: "var(--ink-faint)", fontSize: "0.8rem" }}>
        Translation display mode and offline dictionary/model status will appear here once
        lib/translation is wired up.
      </p>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "20px 22px",
  marginBottom: 18,
};
