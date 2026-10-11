'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Level + XP progress, shown on the screen where XP is actually earned.
 *
 * The reward loop was previously broken: you earned XP on the Add screen but
 * the only bar lived on Home, so the number changed where nobody was looking.
 * Seeing the bar move is what makes logging feel worth repeating — the text
 * "+10 XP" states the reward, this shows it.
 */
export default function XpMeter({
  level, xpInto, xpFor, pulse,
}: {
  level: number;
  xpInto: number;
  xpFor: number;
  /** `n` increments on each award; `gained` is the XP that award was worth. */
  pulse: { n: number; gained: number };
}) {
  const [shown, setShown] = useState(xpInto);
  const [gain, setGain] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const prev = useRef({ xpInto, level, n: pulse.n });

  useEffect(() => {
    const p = prev.current;
    const isAward = pulse.n !== p.n;
    const leveled = level > p.level;
    prev.current = { xpInto, level, n: pulse.n };

    // Only animate on a real award, not on an unrelated re-render.
    if (!isAward) { setShown(xpInto); return; }

    // The award amount comes from the server response, so the badge is correct
    // even though the refreshed totals arrive a tick after the pulse.
    setGain(pulse.gained);
    if (leveled) setLevelUp(true);

    // Count the number up rather than snapping, so the gain is legible.
    const from = leveled ? 0 : p.xpInto;
    const start = performance.now();
    const DUR = 650;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      // Ease-out: fast at first, settling at the end.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (xpInto - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const clearGain = setTimeout(() => setGain(null), 1100);
    const clearLevel = setTimeout(() => setLevelUp(false), 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clearGain);
      clearTimeout(clearLevel);
    };
  }, [xpInto, xpFor, level, pulse]);

  const pct = xpFor > 0 ? Math.max(0, Math.min(1, shown / xpFor)) : 0;
  const remaining = Math.max(0, xpFor - xpInto);
  // Anticipation, but only when it is genuinely true — no manufactured urgency.
  const nearLevel = remaining > 0 && remaining <= Math.max(20, xpFor * 0.15);

  return (
    <div className={`xpmeter ${levelUp ? 'xpmeter-levelup' : ''}`}>
      <div className="xpmeter-top">
        <span className="xpmeter-level">Level {level}</span>
        <span className="xpmeter-count num">
          {shown}<span className="xpmeter-of"> / {xpFor} XP</span>
        </span>
      </div>

      <div className="xpmeter-track">
        <div className="xpmeter-fill" style={{ width: `${pct * 100}%` }} />
      </div>

      {gain !== null && (
        <span key={pulse.n} className="xpmeter-gain num" aria-hidden>+{gain}</span>
      )}

      {nearLevel && gain === null && (
        <div className="xpmeter-near">{remaining} XP to level {level + 1}</div>
      )}
    </div>
  );
}
