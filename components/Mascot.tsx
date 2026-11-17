/**
 * Coffer's mascot: a chibi kid in a penguin onesie, with Coffer's gold-coin
 * hair clip. Drawn as inline SVG so it scales crisply and needs no images.
 *
 * Moods stay kind on purpose — there is no sad or angry face, because the
 * app never shames spending:
 *   happy  – default, gentle smile
 *   cheer  – flippers up, open grin (you logged today / milestone)
 *   calm   – soft neutral mouth (over budget: reassuring, not alarmed)
 */
export type Mood = 'happy' | 'cheer' | 'calm';

const SUIT = '#2d3142';      // penguin charcoal
const SUIT_HI = '#3d4257';   // soft highlight on the suit
const BELLY = '#f7f8fb';
const BEAK = '#f6b93b';
const BEAK_DARK = '#d9921a';
const SKIN = '#ffe6d5';
const HAIR = '#26262f';
const IRIS = '#5d6f8c';
const COIN = '#f5c04a';
const COIN_EDGE = '#d99a1e';

export default function Mascot({
  mood = 'happy', head = false, className, title,
}: {
  mood?: Mood;
  /** Crop to the head only, for avatars. */
  head?: boolean;
  className?: string;
  title?: string;
}) {
  const cheer = mood === 'cheer';

  return (
    <svg viewBox={head ? '12 4 96 96' : '0 0 120 152'} className={className}
         role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {!head && (
        <>
          <ellipse cx="60" cy="147" rx="32" ry="4.5" fill="rgba(31,42,68,.13)" />
          {/* tail */}
          <path d="M84 122 Q100 128 104 138 Q92 138 82 132 Z" fill={SUIT} />
          {/* feet */}
          <ellipse cx="47" cy="141" rx="10" ry="5" fill={BEAK} />
          <ellipse cx="73" cy="141" rx="10" ry="5" fill={BEAK} />
          <path d="M42 141 v3 M47 142 v3 M52 141 v3 M68 141 v3 M73 142 v3 M78 141 v3"
                stroke={BEAK_DARK} strokeWidth="1.4" strokeLinecap="round" />
          {/* flippers: raised when cheering */}
          {cheer ? (
            <>
              <ellipse cx="24" cy="92" rx="8" ry="17" fill={SUIT} transform="rotate(-38 24 92)" />
              <ellipse cx="96" cy="92" rx="8" ry="17" fill={SUIT} transform="rotate(38 96 92)" />
            </>
          ) : (
            <>
              <ellipse cx="27" cy="114" rx="7.5" ry="17" fill={SUIT} transform="rotate(16 27 114)" />
              <ellipse cx="93" cy="114" rx="7.5" ry="17" fill={SUIT} transform="rotate(-16 93 114)" />
            </>
          )}
          {/* body */}
          <path d="M30 134 Q24 94 60 90 Q96 94 90 134 Q60 145 30 134 Z" fill={SUIT} />
          <path d="M38 102 Q44 95 54 93" fill="none" stroke={SUIT_HI} strokeWidth="3"
                strokeLinecap="round" />
          {/* belly */}
          <ellipse cx="60" cy="119" rx="20" ry="21" fill={BELLY} />
        </>
      )}

      {/* hood */}
      <circle cx="60" cy="52" r="44" fill={SUIT} />
      <path d="M30 26 Q42 13 58 11" fill="none" stroke={SUIT_HI} strokeWidth="3.5"
            strokeLinecap="round" />
      {/* hood's penguin eyes and beak */}
      <circle cx="41" cy="22" r="6.5" fill="#fff" />
      <circle cx="79" cy="22" r="6.5" fill="#fff" />
      <circle cx="42" cy="23" r="3.2" fill={HAIR} />
      <circle cx="78" cy="23" r="3.2" fill={HAIR} />
      <path d="M49 25 Q60 20 71 25 Q67 36 60 38 Q53 36 49 25 Z" fill={BEAK}
            stroke={BEAK_DARK} strokeWidth="1.2" strokeLinejoin="round" />

      {/* face opening */}
      <circle cx="60" cy="64" r="30" fill={SKIN} />
      {/* side hair */}
      <path d="M31 60 Q28 80 34 92 Q38 84 37 70 Z" fill={HAIR} />
      <path d="M89 60 Q92 80 86 92 Q82 84 83 70 Z" fill={HAIR} />
      {/* bangs */}
      <path d="M30 66 Q29 37 60 36 Q91 37 90 66 Q87 55 81 53 Q77 59 72 53 Q66 60 60 53
               Q54 60 48 53 Q43 59 39 53 Q33 55 30 66 Z" fill={HAIR} />
      {/* Coffer's coin hair clip */}
      <g transform="rotate(-20 36 55)">
        <circle cx="36" cy="55" r="5.5" fill={COIN} stroke={COIN_EDGE} strokeWidth="1.6" />
        <circle cx="36" cy="55" r="2.2" fill="none" stroke={COIN_EDGE} strokeWidth="1.2" />
      </g>

      {/* eyes */}
      {[47, 73].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="71" rx="7" ry={mood === 'calm' ? 6.5 : 8.5} fill={IRIS} />
          <ellipse cx={x} cy="72.5" rx="3.6" ry={mood === 'calm' ? 3.6 : 4.8} fill="#2e3850" />
          <circle cx={x + 2.4} cy="67.5" r="2.6" fill="#fff" />
          <circle cx={x - 2.2} cy="75.5" r="1.2" fill="#fff" />
          {/* upper lash line */}
          <path d={mood === 'calm'
                    ? `M${x - 7.4} 69.5 Q${x} 62 ${x + 7.4} 69.5`
                    : `M${x - 7.6} 68 Q${x} 59.8 ${x + 7.6} 68`}
                fill="none" stroke={HAIR} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      ))}

      {/* blush */}
      <ellipse cx="38" cy="82" rx="6" ry="3.4" fill="#ff9aa2" opacity=".5" />
      <ellipse cx="82" cy="82" rx="6" ry="3.4" fill="#ff9aa2" opacity=".5" />

      {/* mouth */}
      {cheer && (
        <path d="M53.5 82 Q60 93 66.5 82 Z" fill="#e0606a" stroke="#9c3a43" strokeWidth="1.3"
              strokeLinejoin="round" />
      )}
      {mood === 'happy' && (
        <path d="M55 83 Q60 88 65 83" fill="none" stroke="#9c3a43" strokeWidth="2.3"
              strokeLinecap="round" />
      )}
      {mood === 'calm' && (
        <path d="M56 85.5 Q58 83.5 60 85.5 Q62 87.5 64 85.5" fill="none" stroke="#9c3a43"
              strokeWidth="2.1" strokeLinecap="round" />
      )}
    </svg>
  );
}
