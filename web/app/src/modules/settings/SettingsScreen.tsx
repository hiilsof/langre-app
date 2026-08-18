import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../../lib/storage";
import type { FuriganaMode, Theme } from "../../types";

// Settings module. Furigana mode and theme are real and persisted (and
// shared with the Reader screen, which reads/writes the same stored
// value). TTS voice/speed, translation mode, and offline-asset status
// aren't here yet — those depend on lib/tts and lib/translation, which
// are still stubs.

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

  useEffect(() => {
    getSettings().then((s) => setFuriganaMode(s.furigana));
  }, []);

  async function changeFurigana(mode: FuriganaMode) {
    setFuriganaMode(mode);
    const settings = await getSettings();
    await saveSettings({ ...settings, furigana: mode });
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

      <p style={{ color: "var(--ink-faint)", fontSize: "0.8rem" }}>
        Text-to-speech voice/speed, translation display mode, and offline dictionary/model status
        will appear here once those modules are wired up.
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
