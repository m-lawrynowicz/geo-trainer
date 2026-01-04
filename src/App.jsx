import { useEffect, useMemo, useState } from "react";
import countries from "./data/countries.json";
import "./App.css";

// Robust-enough v1 normalizer:
// - lowercase
// - remove diacritics (São -> Sao)
// - expand "st" -> "saint"
// - remove punctuation/spaces (St. John's -> saintjohns)
function normalize(input) {
  if (!input) return "";

  let s = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  s = s.replace(/\bst\b/g, "saint");
  s = s.replace(/[^a-z0-9]/g, "");

  return s;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const data = useMemo(() => countries, []);

  // "idle" | "run" | "summary"
  const [phase, setPhase] = useState("idle");

  // "deck" | "timed"
  const [mode, setMode] = useState("timed");

  // Timer config (used only for timed mode)
  const [timeLimitSec, setTimeLimitSec] = useState(60);
  const [timeLeftSec, setTimeLeftSec] = useState(0);

  const [deck, setDeck] = useState([]);
  const [deckPos, setDeckPos] = useState(0);
  const current = deck[deckPos] ?? null;

  const [answer, setAnswer] = useState("");

  // Per-run stats
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // "correct" | "wrong" | null
  const [flash, setFlash] = useState(null);

  function startRun() {
    const shuffled = shuffleArray(data);
    setDeck(shuffled);
    setDeckPos(0);

    setScore(0);
    setAttempts(0);
    setCurrentStreak(0);
    setBestStreak(0);

    setFlash(null);
    setAnswer("");

    if (mode === "timed") {
      setTimeLeftSec(timeLimitSec);
    } else {
      setTimeLeftSec(0);
    }

    setPhase("run");
  }

  function endRun() {
    setFlash(null);
    setAnswer("");
    setPhase("summary");
  }

  function getCapitalList(countryObj) {
    if (!countryObj) return [];
    if (Array.isArray(countryObj.capitals)) return countryObj.capitals;
    if (countryObj.capital) return [countryObj.capital];
    return [];
  }

  // Countdown tick while in "run" AND mode === "timed"
  useEffect(() => {
    if (phase !== "run") return;
    if (mode !== "timed") return;
    if (timeLeftSec <= 0) return;

    const id = window.setInterval(() => {
      setTimeLeftSec((t) => t - 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase, mode, timeLeftSec]);

  // End run when time is up (timed mode)
  useEffect(() => {
    if (phase !== "run") return;
    if (mode !== "timed") return;
    if (timeLeftSec === 0) endRun();
  }, [phase, mode, timeLeftSec]);

  function submitAnswer() {
    if (phase !== "run") return;
    if (!current) return;
    if (mode === "timed" && timeLeftSec <= 0) return;

    const user = normalize(answer);
    const capitalList = getCapitalList(current);
    const expectedNormalized = capitalList.map((c) => normalize(c));
    const isCorrect = user.length > 0 && expectedNormalized.includes(user);

    setAttempts((a) => a + 1);
    setFlash(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setScore((s) => s + 1);
      setCurrentStreak((st) => {
        const next = st + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else {
      setCurrentStreak(0);
    }

    // Advance immediately
    const nextPos = deckPos + 1;

    // If we hit end-of-deck:
    if (nextPos >= deck.length) {
      if (mode === "deck") {
        // Deck mode ends the run when the deck ends
        window.setTimeout(() => {
          setFlash(null);
          endRun();
        }, 250);
        return;
      }

      // Timed mode: reshuffle and continue (infinite supply while timer runs)
      const reshuffled = shuffleArray(data);
      setDeck(reshuffled);
      setDeckPos(0);
      setAnswer("");
      window.setTimeout(() => setFlash(null), 250);
      return;
    }

    // Normal next card
    setDeckPos(nextPos);
    setAnswer("");
    window.setTimeout(() => setFlash(null), 250);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    }
  }

  const total = deck.length;
  const progress = phase === "run" && total > 0 ? deckPos + 1 : 0;
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  // ---------- UI ----------
  const containerStyle = { padding: 16, maxWidth: 720, margin: "0 auto" };

  if (phase === "idle") {
    const timerOptions = [30, 60, 120];

    return (
      <div style={containerStyle}>
        <h1 style={{ marginBottom: 8 }}>Jungle Geo-Trainer</h1>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          No answer reveals yet. Pick a mode, then start.
        </p>

        <div style={{ marginTop: 12 }}>
          <div
  style={{
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 6,
    textAlign: "center",
  }}
>
  Mode
</div>


          <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  }}
>
            <button
              onClick={() => setMode("deck")}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ccc",
                cursor: "pointer",
                fontSize: 14,
                opacity: mode === "deck" ? 1 : 0.75,
              }}
            >
              Deck run
            </button>

            <button
              onClick={() => setMode("timed")}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ccc",
                cursor: "pointer",
                fontSize: 14,
                opacity: mode === "timed" ? 1 : 0.75,
              }}
            >
              Timed run
            </button>
          </div>

          {mode === "deck" ? (
            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
              Deck run ends when you finish the shuffled deck.
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 6 }}>
                Timer
              </div>

              <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  }}
>

                {timerOptions.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setTimeLimitSec(sec)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ccc",
                      cursor: "pointer",
                      fontSize: 14,
                      opacity: timeLimitSec === sec ? 1 : 0.75,
                    }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
                Timed run ends when the timer hits 0. Deck reshuffles if needed.
              </div>
            </div>
          )}
        </div>

        <button
          onClick={startRun}
          style={{
            marginTop: 16,
            padding: "12px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Start {mode === "timed" ? `timed run (${timeLimitSec}s)` : "deck run"}
        </button>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Dataset loaded: <b>{data.length}</b> countries
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div style={containerStyle}>
        <h1 style={{ marginBottom: 8 }}>Run summary</h1>

        <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 10 }}>
          Mode: <b>{mode === "timed" ? "Timed" : "Deck"}</b>
          {mode === "timed" && (
            <>
              {" "}
              · Time limit: <b>{timeLimitSec}s</b>
            </>
          )}
        </div>

        <div style={{ fontSize: 18, marginBottom: 8 }}>
          Correct: <b>{score}</b> / <b>{attempts}</b>{" "}
          <span style={{ opacity: 0.75 }}>(accuracy {accuracy}%)</span>
        </div>

        <div style={{ fontSize: 18, marginBottom: 12 }}>
          Best streak: <b>{bestStreak}</b>
        </div>

        <button
          onClick={startRun}
          style={{
            padding: "12px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          Start again
        </button>

        <button
          onClick={() => setPhase("idle")}
          style={{
            padding: "12px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Back to start
        </button>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Next up later: teaching mode.
        </div>
      </div>
    );
  }

  // phase === "run"
  if (!current) return <div style={containerStyle}>Loading…</div>;

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: 8 }}>Jungle Geo-Trainer</h1>

      {/* Centered “HUD” */}
      <div
        style={{
          display: "flex",
          gap: 24,
          justifyContent: "center",
          flexWrap: "wrap",
          opacity: 0.85,
          marginTop: 8,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        {mode === "timed" && (
          <div>
            Time
            <br />
            <b>{timeLeftSec}s</b>
          </div>
        )}

        <div>
          {mode === "deck" ? "Card" : "Deck"}
          <br />
          <b>{progress}</b> / <b>{total}</b>
        </div>

        <div>
          Correct
          <br />
          <b>{score}</b> / <b>{attempts}</b>
        </div>

        <div>
          Streak
          <br />
          <b>{currentStreak}</b> (best <b>{bestStreak}</b>)
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 18 }}>
        What is the capital of <b>{current.country}</b>?
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type capital and press Enter"
          style={{
            flex: 1,
            padding: "10px 12px",
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
          autoFocus
        />

        <button
          onClick={submitAnswer}
          style={{
            padding: "10px 12px",
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Check
        </button>

        <div
          aria-label="result"
          style={{
            width: 28,
            height: 28,
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            opacity: flash ? 1 : 0,
            transform: flash ? "scale(1)" : "scale(0.8)",
            transition: "opacity 120ms ease, transform 120ms ease",
          }}
        >
          {flash === "correct" ? "✅" : flash === "wrong" ? "❌" : ""}
        </div>
      </div>

      <button
        onClick={endRun}
        style={{
          marginTop: 14,
          padding: "10px 12px",
          fontSize: 14,
          borderRadius: 10,
          border: "1px solid #ccc",
          cursor: "pointer",
          opacity: 0.8,
        }}
      >
        End run
      </button>
    </div>
  );
}
