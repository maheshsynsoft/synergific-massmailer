import s from "./auth.module.css";

const d = (sec: number) => ({ animationDelay: `${sec}s` });

const SKIN = "#f4bfa6";
const HAIR = "#232647";
const SHIRT = "#f08a7a";
const JEANS = "#40609f";

function Envelope({ delay }: { delay: number }) {
  return (
    <g className={s.envelope} style={d(delay)}>
      <rect x={-15} y={-10} width={30} height={20} rx={3.5} fill="#fff" stroke="#7c6cf0" strokeWidth={1.6} />
      <path d="M-14 -8.5 L0 2 L14 -8.5" fill="none" stroke="#7c6cf0" strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

function Sparkle({ x, y, size = 8, color = "#fff", delay = 0 }: { x: number; y: number; size?: number; color?: string; delay?: number }) {
  const k = size;
  return (
    <path
      className={s.twinkle}
      style={d(delay)}
      d={`M${x} ${y - k} Q${x} ${y} ${x + k} ${y} Q${x} ${y} ${x} ${y + k} Q${x} ${y} ${x - k} ${y} Q${x} ${y} ${x} ${y - k} Z`}
      fill={color}
    />
  );
}

/** Fully animated "person signing in" scene. Pure SVG + CSS, no deps. */
export function LoginIllustration({ className }: { className?: string }) {
  const typed = [0, 1, 2, 3, 4, 5];

  return (
    <svg viewBox="0 0 480 520" className={`${s.scene} ${className ?? ""}`} shapeRendering="geometricPrecision" role="img" aria-label="Person signing in on a laptop">
      {/* ── Pastel colour blocks ───────────────────────── */}
      <g className={s.pop} style={d(0.15)}>
        <rect x={18} y={40} width={150} height={400} rx={42} fill="#f8dca9" />
      </g>
      <g className={s.pop} style={d(0.2)}>
        <rect x={92} y={18} width={210} height={170} rx={42} fill="#d9caf1" />
      </g>
      <g className={s.pop} style={d(0.25)}>
        <rect x={18} y={262} width={128} height={196} rx={42} fill="#f39a8c" />
      </g>
      <g className={s.pop} style={d(0.3)}>
        <rect x={112} y={372} width={170} height={96} rx={32} fill="#a2d6ab" />
      </g>
      <g className={s.pop} style={d(0.35)}>
        <rect x={250} y={196} width={208} height={230} rx={42} fill="#cddcf2" />
      </g>

      {/* ── Floating login card ────────────────────────── */}
      <g className={s.pop} style={d(0.45)}>
        <g>
          <rect x={52} y={70} width={204} height={278} rx={24} fill="#fff" stroke="#d6cbf3" strokeWidth={2} />

          {/* pie chart */}
          <g className={s.spin}>
            <circle cx={154} cy={118} r={22} fill="#cad9ef" />
            <circle cx={154} cy={118} r={11} fill="none" stroke="#f39a8c" strokeWidth={22} strokeDasharray="24 69.1" />
            <circle cx={154} cy={118} r={11} fill="none" stroke="#f8d38f" strokeWidth={22} strokeDasharray="17 69.1" strokeDashoffset={-24} />
          </g>

          {/* email field */}
          <rect x={74} y={168} width={160} height={28} rx={14} fill="#fff" stroke="#a6d8b0" strokeWidth={1.6} />
          <circle cx={89} cy={182} r={5} fill="#86cc95" />
          {typed.map((i) => (
            <circle key={`a${i}`} className={s.typeDot} style={d(0.3 + i * 0.18)} cx={104 + i * 10} cy={182} r={2.6} fill="#c3aedd" />
          ))}

          {/* password field */}
          <rect x={74} y={206} width={160} height={28} rx={14} fill="#fff" stroke="#a6d8b0" strokeWidth={1.6} />
          <circle cx={89} cy={220} r={5} fill="#86cc95" />
          {typed.map((i) => (
            <circle key={`b${i}`} className={s.typeDot} style={d(1.6 + i * 0.18)} cx={104 + i * 10} cy={220} r={2.6} fill="#c3aedd" />
          ))}

          <rect x={104} y={250} width={100} height={7} rx={3.5} fill="#7d9ce8" />
          {typed.slice(0, 5).map((i) => (
            <circle key={`w${i}`} className={s.wave} style={d(i * 0.12)} cx={132 + i * 11} cy={270} r={2.2} fill="#8fcf9b" />
          ))}

          {/* button */}
          <g className={s.press}>
            <rect x={114} y={284} width={80} height={30} rx={15} fill="#7d9ce8" />
            <rect x={140} y={297} width={28} height={4} rx={2} fill="#fff" />
          </g>

          {/* success check */}
          <g className={s.check}>
            <circle cx={226} cy={290} r={15} fill="#5cc58a" />
            <path d="M219 290 L224 295 L233 285" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={`p${i}`} cx={132 + i * 11} cy={332} r={3} fill={["#8fcf9b", "#c3aedd", "#7d9ce8", "#c3aedd", "#d4c4ec"][i]} />
          ))}
        </g>
      </g>

      {/* ── Plant ──────────────────────────────────────── */}
      <g className={s.pop} style={d(0.6)}>
        <g className={s.sway}>
          <path d="M66 450 C50 420 44 396 52 372 C64 392 70 420 66 450 Z" fill="#5fae73" />
        </g>
        <g className={s.swayAlt}>
          <path d="M70 450 C78 418 92 400 112 392 C106 418 92 436 70 450 Z" fill="#7cc48d" />
        </g>
        <g className={s.sway} style={d(-1)}>
          <path d="M64 452 C44 436 30 420 28 400 C46 410 58 428 64 452 Z" fill="#4c9a61" />
        </g>
        <path d="M46 448 H92 L86 488 Q85 494 79 494 H59 Q53 494 52 488 Z" fill="#f5f0ff" stroke="#d9caf1" strokeWidth={1.5} />
      </g>

      {/* ── Person ─────────────────────────────────────── */}
      <g className={s.pop} style={d(0.7)}>
        <ellipse className={s.groundShadow} cx={332} cy={488} rx={138} ry={13} fill="#d4cbef" />

        <g>
          {/* hair (back) */}
          <path d="M290 140 C284 96 378 92 372 140 L380 244 C364 258 298 258 282 244 Z" fill={HAIR} />

          {/* legs, crossed */}
          <path d="M236 428 C236 390 288 376 332 384 C376 376 428 390 428 428 C428 458 384 464 332 456 C280 464 236 458 236 428 Z" fill={JEANS} />
          <path d="M268 420 C290 410 314 414 332 428 C350 414 374 410 396 420" fill="none" stroke="#33508a" strokeWidth={3} strokeLinecap="round" />

          {/* shoes */}
          <g>
            <path d="M216 452 C214 438 232 432 250 438 L266 446 C268 458 252 462 232 462 C222 462 217 458 216 452 Z" fill="#2b2e3f" />
            <path d="M234 444 l4 10 M242 443 l4 10 M250 444 l4 9" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
            <path d="M448 452 C450 438 432 432 414 438 L398 446 C396 458 412 462 432 462 C442 462 447 458 448 452 Z" fill="#2b2e3f" />
            <path d="M430 444 l-4 10 M422 443 l-4 10 M414 444 l-4 9" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          </g>

          {/* torso */}
          <path d="M276 222 C278 204 300 198 332 198 C364 198 386 204 388 222 L398 392 L266 392 Z" fill={SHIRT} />

          {/* arms (behind laptop) */}
          <path d="M282 222 C266 250 260 290 268 330 C272 352 290 366 306 372" fill="none" stroke={SHIRT} strokeWidth={22} strokeLinecap="round" />
          <path d="M268 300 C272 340 288 362 306 372" fill="none" stroke={SKIN} strokeWidth={15} strokeLinecap="round" />
          <path d="M382 222 C398 250 404 290 396 330 C392 352 374 366 358 372" fill="none" stroke={SHIRT} strokeWidth={22} strokeLinecap="round" />
          <path d="M396 300 C392 340 376 362 358 372" fill="none" stroke={SKIN} strokeWidth={15} strokeLinecap="round" />

          {/* neck + collar */}
          <rect x={321} y={176} width={22} height={28} rx={8} fill={SKIN} />
          <path d="M312 200 Q332 222 352 200" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" />

          {/* head */}
          <g className={s.head}>
            <ellipse cx={332} cy={146} rx={31} ry={35} fill={SKIN} />
            <ellipse cx={301} cy={150} rx={5} ry={7} fill={SKIN} />
            <ellipse cx={363} cy={150} rx={5} ry={7} fill={SKIN} />
            {/* brows */}
            <path d="M314 137 Q320 133 326 136" fill="none" stroke={HAIR} strokeWidth={2.2} strokeLinecap="round" />
            <path d="M338 136 Q344 133 350 137" fill="none" stroke={HAIR} strokeWidth={2.2} strokeLinecap="round" />
            {/* eyes */}
            <ellipse className={s.blink} cx={320} cy={148} rx={3} ry={3.8} fill={HAIR} />
            <ellipse className={s.blink} cx={344} cy={148} rx={3} ry={3.8} fill={HAIR} />
            {/* cheeks + smile */}
            <circle cx={312} cy={160} r={5} fill="#f39a8c" opacity={0.45} />
            <circle cx={352} cy={160} r={5} fill="#f39a8c" opacity={0.45} />
            <path d="M324 164 Q332 171 340 164" fill="none" stroke="#c4574a" strokeWidth={2.4} strokeLinecap="round" />
            {/* hair (front) */}
            <path d="M298 150 C292 108 322 100 338 104 C360 108 370 128 366 152 C360 132 346 120 334 120 C322 130 308 138 298 150 Z" fill={HAIR} />
          </g>

          {/* laptop */}
          <rect x={258} y={386} width={148} height={9} rx={4.5} fill="#bfcbdb" />
          <rect x={268} y={300} width={128} height={90} rx={10} fill="#dfe7f1" stroke="#c3cfdf" strokeWidth={1.5} />
          <circle className={s.screenGlow} cx={332} cy={344} r={10} fill="#fff" />
          <circle cx={332} cy={344} r={18} fill="none" stroke="#fff" strokeWidth={1.2} opacity={0.5} className={s.screenGlow} style={d(1.5)} />
        </g>
      </g>

      {/* ── Envelopes flying out of the laptop ─────────── */}
      <g transform="translate(340 300)">
        <Envelope delay={1.2} />
        <Envelope delay={2.8} />
        <Envelope delay={4.4} />
      </g>

      {/* ── Sparkles ───────────────────────────────────── */}
      <Sparkle x={420} y={60} size={9} delay={0} />
      <Sparkle x={460} y={150} size={6} color="#f8dca9" delay={0.8} />
      <Sparkle x={250} y={40} size={7} color="#f39a8c" delay={1.4} />
      <Sparkle x={40} y={20} size={6} delay={2} />
      <circle className={s.floatAlt} cx={448} cy={250} r={6} fill="#a2d6ab" />
      <circle className={s.float} cx={232} cy={176} r={4} fill="#f8dca9" />
    </svg>
  );
}
