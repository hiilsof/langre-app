import { useState } from "react";
import { LibraryScreen } from "./modules/library/LibraryScreen";
import { ReaderScreen } from "./modules/reader/ReaderScreen";
import { VocabularyScreen } from "./modules/vocabulary/VocabularyScreen";
import { SettingsScreen } from "./modules/settings/SettingsScreen";

type ScreenName = "library" | "reader" | "vocabulary" | "settings";

const NAV_ITEMS: { name: ScreenName; label: string }[] = [
  { name: "library", label: "Library" },
  { name: "reader", label: "Reader" },
  { name: "vocabulary", label: "Vocabulary" },
  { name: "settings", label: "Settings" },
];

const SCREENS: Record<ScreenName, React.ComponentType> = {
  library: LibraryScreen,
  reader: ReaderScreen,
  vocabulary: VocabularyScreen,
  settings: SettingsScreen,
};

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("library");
  const Screen = SCREENS[screen];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        aria-label="Primary"
        style={{
          width: 220,
          flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "24px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", padding: "0 8px 20px" }}>
          読 Yomikata
        </div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.name}
            onClick={() => setScreen(item.name)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              font: "inherit",
              background: screen === item.name ? "var(--accent-soft)" : "transparent",
              color: screen === item.name ? "var(--accent-deep)" : "var(--ink-soft)",
              fontWeight: screen === item.name ? 700 : 400,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main style={{ flex: 1, padding: "32px 40px" }}>
        <Screen />
      </main>
    </div>
  );
}
