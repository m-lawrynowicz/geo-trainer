import { useEffect, useMemo, useState } from "react";
import countries from "./data/countries.json";
import "./App.css";

// Robust-enough v1 normalizer:
// - lowercase
// - remove diacritics (São -> Sao)
// - remove punctuation/spaces (St. John's -> stjohns)
// - expand a couple common abbreviations (st -> saint)
function normalize(input) {
  if (!input) return "";

  let s = input
    .trim()
    .toLowerCase()
    // remove diacritics
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Expand common abbreviations at word boundaries before we strip punctuation
  // "st johns" -> "saint johns"
  s = s.replace(/\bst\b/g, "saint");

  // Remove punctuation and whitespace (keep letters/numbers only)
  s = s.replace(/[^a-z0-9]/g, "");

  return s;
}

function pickRandomCountry(list, avoidCode) {
  if (!list?.length) return null;
  if (list.length === 1) return list[0];

  let next = null;
  let guard = 0;

  do {
    next = list[Math.floor(Math.random() * list.length)];
    guard += 1;
  } while (next?.code === avoidCode && guard < 20);

  return next;
}

export default function App() {
  const data = useMemo(() => countries, []);
  const [current, setCurrent] = useState(null);

  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);

  // "correct" | "wrong" | null
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    // initial question
    setCurrent(pickRandomCountry(data));
  }, [data]);

  function submitAnswer() {
    if (!current) return;

    const user = normalize(answer);
    const expected = normalize(current.capital);

    const isCorrect = user.length > 0 && user === expected;

    setFlash(isCorrect ? "correct" : "wrong");

    if (isCorrect) setScore((s) => s + 1);

    // Immediately move on (timed-mode friendly)
    const next = pickRandomCountry(data, current.code);
    setCurrent(next);

    // Clear input for next question
    setAnswer("");

    // Turn off flash after a short moment
    window.setTimeout(() => setFlash(null), 250);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    }
  }

  if (!current) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Jungle Geo-Trainer</h1>

      <div style={{ marginBottom: 12, fontSize: 18 }}>
        What is the capital of <b>{current.country}</b>?
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      <div style={{ marginTop: 12 }}>
        Score: <b>{score}</b>
      </div>

      <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
        No answer reveal yet (teaching mode later). Quick feedback only.
      </div>
    </div>
  );
}
