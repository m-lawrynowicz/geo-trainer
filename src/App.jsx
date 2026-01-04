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

  const [deck, setDeck] = useState([]);
  const [deckPos, setDeckPos] = useState(0);
  const current = deck[deckPos] ?? null;

  const [answer, setAnswer] = useState("");

  // Per-run stats
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Timer
  const [timeLimitSec] = useState(60); // change later or make configurable
  const [timeLeftSec, setTimeLeftSec] = useState(0);

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

    setTimeLeftSec(timeLimitSec);
    setPhase("run");
  }

  function endRun() {
    setFlash(null);
    setAnswer("");
    setPhase("summary");
  }

  function getCapitalList(countryObj) {
    // Support both schemas:
    // - new: capitals: ["Warsaw"]
    // - old: capital: "Warsaw"
    if (!countryObj) return [];
    if (Array.isArray(countryObj.capitals)) return countryObj.capitals;
    if (countryObj.capital) return [countryObj.capital];
    return [];
  }

  // Countdown tick while in "run"
  useEffect(() => {
    if (phase !== "run") return;
    if (timeLeftSec <= 0) return;

    const id = window.setInterval(() => {
      setTimeLeftSec((t) => t - 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [phase, timeLeftSec]);

  // End run when time is up
  useEffect(() => {
    if (phase !== "run") return;
    if (timeLeftSec === 0) endRun();
  }, [phase, timeLeftSec]);

  function submitAnswer() {
    if (phase !== "run") return;
    if (!current) return;
    if (timeLeftSec <= 0) return;

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

    // Immediately advance. If we hit end-of-deck, finish the run early.
    const nextPos = deckPos + 1;

    if (nextPos >= deck.length) {
      window.setTimeout(() => {
        setFlash(null);
        endRun();
      }, 250);
    } else {
      setDeckPos(nextPos);
      setAnswer("");
      window.setTimeout(() => setFlash(null), 250);
    }
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
    return (
      <div style={containerStyle}>
        <h1 style={{ marginBottom: 8 }}>Jungle Geo-Trainer</h1>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          One run = one full shuffled deck or until the timer ends. No answer
          reveals yet.
        </p>

        <button
          onClick={startRun}
          style={{
            padding: "12px 14px",
            fontSize: 16,
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Start run ({timeLimitSec}s)
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

        <div style={{ fontSize: 18, marginBottom: 8 }}>
          Correct: <b>{score}</b> / <b>{attempts}</b>{" "}
          <span style={{ opacity: 0.75 }}>(accuracy {accuracy}%)</span>
        </div>

        <div style={{ fontSize: 18, marginBottom: 8 }}>
          Best streak: <b>{bestStreak}</b>
        </div>

        <div style={{ fontSize: 14, opacity: 0.75, marginBottom: 14 }}>
          Time limit: <b>{timeLimitSec}s</b>
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
          Start new run
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
          Next up later: teaching mode + configurable timer.
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
        <div>
          Time
          <br />
          <b>{timeLeftSec}s</b>
        </div>

        <div>
          Card
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
