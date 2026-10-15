"use client";
import { useEffect, useState } from "react";

function germanVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("de"));
  return voices.find((v) => /natural|online|google/i.test(v.name)) ?? voices[0];
}

/** Reads German text aloud with the browser's speech engine. */
export function Speak({ text, label, rate = 0.92 }: { text: string; label: string; rate?: number }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // speechSynthesis exists only in the browser; enable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported("speechSynthesis" in window);
  }, []);

  if (!supported) return null;

  const say = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = rate;
    const v = germanVoice();
    if (v) u.voice = v;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  return (
    <button type="button" className={`speak ${speaking ? "is-on" : ""}`} onClick={say} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
