import './AnimatedOceanScene.css';

/**
 * AnimatedOceanScene — Enhanced Version
 * 
 * A richly detailed, CSS-animated 2D ocean landscape with living creatures.
 * 
 * Living Elements:
 *  - Fisherman on boat casting/pulling a fishing net
 *  - Schools of small fish (sardines)
 *  - Individual fish: Mackerel, Tuna, Tropical fish, Swordfish
 *  - Jellyfish with pulsing body & swaying tentacles
 *  - Sea turtle gliding across
 *  - Seahorse bobbing
 *  - Dolphin jumping out of water
 *  - Seagulls hovering near the boat
 *  - Crab walking on the sea floor
 *  - Starfish on the bottom
 *  - Coral & seaweed on the ocean floor
 *  - Rising air bubbles
 */

// ── Star data ──
const stars = [
  { x: '8%',  y: '5%',  delay: '0s' },
  { x: '15%', y: '12%', delay: '1.2s' },
  { x: '22%', y: '3%',  delay: '0.5s', lg: true },
  { x: '35%', y: '8%',  delay: '2.1s' },
  { x: '42%', y: '14%', delay: '0.8s' },
  { x: '55%', y: '4%',  delay: '1.7s', lg: true },
  { x: '63%', y: '10%', delay: '0.3s' },
  { x: '72%', y: '6%',  delay: '2.5s' },
  { x: '78%', y: '15%', delay: '1.0s', lg: true },
  { x: '85%', y: '3%',  delay: '1.9s' },
  { x: '90%', y: '11%', delay: '0.6s' },
  { x: '95%', y: '7%',  delay: '2.3s' },
  { x: '12%', y: '18%', delay: '1.4s' },
  { x: '28%', y: '20%', delay: '0.2s' },
  { x: '48%', y: '18%', delay: '2.0s' },
  { x: '68%', y: '20%', delay: '0.9s' },
  { x: '82%', y: '19%', delay: '1.6s', lg: true },
];

// ── SVG Inline Components ──

/** Small sardine-like fish for schools */
const SmallFish = ({ color = '#8ec8d8' }: { color?: string }) => (
  <svg width="16" height="8" viewBox="0 0 16 8">
    <ellipse cx="7" cy="4" rx="6" ry="3" fill={color} opacity="0.8" />
    <polygon points="14,4 16,1.5 16,6.5" fill={color} opacity="0.7" />
    <circle cx="4" cy="3.5" r="0.7" fill="#021520" />
  </svg>
);

/** Medium mackerel-type fish */
const MackerelFish = () => (
  <svg width="45" height="20" viewBox="0 0 45 20">
    <ellipse cx="20" cy="10" rx="16" ry="7" fill="#6aafb8" />
    <ellipse cx="20" cy="10" rx="14" ry="5.5" fill="#89c9d1" />
    {/* Stripe pattern */}
    <line x1="12" y1="5" x2="14" y2="15" stroke="#5a9aa3" strokeWidth="0.6" opacity="0.5" />
    <line x1="16" y1="4" x2="18" y2="16" stroke="#5a9aa3" strokeWidth="0.6" opacity="0.5" />
    <line x1="20" y1="3.5" x2="22" y2="16.5" stroke="#5a9aa3" strokeWidth="0.6" opacity="0.5" />
    <line x1="24" y1="4" x2="26" y2="16" stroke="#5a9aa3" strokeWidth="0.6" opacity="0.5" />
    {/* Tail */}
    <polygon points="36,10 44,3 44,17" fill="#6aafb8" opacity="0.9" />
    {/* Dorsal fin */}
    <polygon points="15,3 20,0 24,3" fill="#5a9aa3" opacity="0.7" />
    {/* Eye */}
    <circle cx="8" cy="9" r="2" fill="#031825" />
    <circle cx="7.5" cy="8.5" r="0.6" fill="#ffffff" opacity="0.6" />
    {/* Belly highlight */}
    <ellipse cx="20" cy="12" rx="10" ry="3" fill="#a8dce3" opacity="0.4" />
  </svg>
);

/** Large tuna-type fish */
const TunaFish = () => (
  <svg width="60" height="28" viewBox="0 0 60 28">
    <ellipse cx="26" cy="14" rx="22" ry="10" fill="#3d8a96" />
    <ellipse cx="26" cy="14" rx="18" ry="7.5" fill="#4a9da8" />
    {/* Tail */}
    <polygon points="48,14 58,4 58,24" fill="#3d8a96" />
    <polygon points="48,14 56,6 56,22" fill="#4a9da8" opacity="0.8" />
    {/* Dorsal fin */}
    <polygon points="18,4 25,0 30,4" fill="#357f8a" />
    {/* Pectoral fin */}
    <polygon points="14,16 8,22 16,20" fill="#4a9da8" opacity="0.7" />
    {/* Finlets near tail */}
    <polygon points="42,8 44,6 46,8" fill="#357f8a" opacity="0.6" />
    <polygon points="44,9" fill="#357f8a" opacity="0.5" />
    {/* Eye */}
    <circle cx="10" cy="12" r="2.5" fill="#021825" />
    <circle cx="9.3" cy="11.3" r="0.8" fill="#fff" opacity="0.5" />
    {/* Lateral line */}
    <line x1="10" y1="14" x2="46" y2="13" stroke="#5ab0bc" strokeWidth="0.5" opacity="0.4" />
    {/* Belly */}
    <ellipse cx="24" cy="18" rx="14" ry="4" fill="#6dbec8" opacity="0.3" />
  </svg>
);

/** Colorful tropical fish */
const TropicalFish = ({ hue = 30 }: { hue?: number }) => (
  <svg width="28" height="24" viewBox="0 0 28 24">
    {/* Body - taller, more disc-shaped */}
    <ellipse cx="14" cy="12" rx="9" ry="9" fill={`hsl(${hue}, 70%, 55%)`} />
    <ellipse cx="14" cy="12" rx="7" ry="7" fill={`hsl(${hue}, 65%, 65%)`} />
    {/* Stripes */}
    <rect x="10" y="4" width="2.5" height="16" rx="1" fill={`hsl(${hue + 40}, 80%, 85%)`} opacity="0.6" />
    <rect x="15" y="5" width="2.5" height="14" rx="1" fill={`hsl(${hue + 40}, 80%, 85%)`} opacity="0.5" />
    {/* Tail */}
    <polygon points="23,12 28,6 28,18" fill={`hsl(${hue}, 60%, 50%)`} />
    {/* Dorsal fin */}
    <polygon points="10,3 14,0 18,3" fill={`hsl(${hue + 20}, 70%, 60%)`} />
    {/* Bottom fin */}
    <polygon points="10,21 14,24 18,21" fill={`hsl(${hue + 20}, 70%, 60%)`} />
    {/* Eye */}
    <circle cx="8" cy="11" r="2" fill="#fff" />
    <circle cx="7.5" cy="11" r="1.2" fill="#111" />
    <circle cx="7.2" cy="10.5" r="0.4" fill="#fff" />
  </svg>
);

/** Swordfish */
const Swordfish = () => (
  <svg width="70" height="22" viewBox="0 0 70 22">
    {/* Sword/bill */}
    <line x1="0" y1="11" x2="15" y2="11" stroke="#4a8a94" strokeWidth="1.5" strokeLinecap="round" />
    {/* Body */}
    <ellipse cx="32" cy="11" rx="18" ry="8" fill="#3a7a86" />
    <ellipse cx="32" cy="11" rx="15" ry="6" fill="#4a8e98" />
    {/* Tail */}
    <polygon points="50,11 60,3 58,11 60,19" fill="#3a7a86" />
    {/* Dorsal fin - tall */}
    <polygon points="25,3 30,0 33,3" fill="#2e6e78" />
    {/* Pectoral fin */}
    <polygon points="22,14 16,20 24,17" fill="#4a8e98" opacity="0.7" />
    {/* Eye */}
    <circle cx="18" cy="10" r="2" fill="#011520" />
    <circle cx="17.5" cy="9.5" r="0.6" fill="#fff" opacity="0.5" />
    {/* Lateral line */}
    <line x1="18" y1="11" x2="48" y2="10.5" stroke="#5aa0aa" strokeWidth="0.4" opacity="0.5" />
  </svg>
);

/** Jellyfish with tentacles */
const JellyfishSVG = () => (
  <svg width="30" height="50" viewBox="0 0 30 50">
    {/* Bell/dome */}
    <g className="ocean-scene__jellyfish-body">
      <ellipse cx="15" cy="12" rx="12" ry="10" fill="rgba(180,140,220,0.35)" />
      <ellipse cx="15" cy="12" rx="9" ry="7" fill="rgba(200,170,240,0.25)" />
      {/* Inner glow */}
      <ellipse cx="15" cy="10" rx="5" ry="4" fill="rgba(230,200,255,0.2)" />
    </g>
    {/* Tentacles */}
    <g className="ocean-scene__jellyfish-tentacle">
      <path d="M8,20 Q6,28 9,35 Q7,40 10,48" stroke="rgba(180,140,220,0.3)" strokeWidth="1" fill="none" />
      <path d="M12,21 Q14,30 11,38 Q13,43 12,50" stroke="rgba(180,140,220,0.25)" strokeWidth="0.8" fill="none" />
      <path d="M18,21 Q16,30 19,38 Q17,44 18,50" stroke="rgba(180,140,220,0.25)" strokeWidth="0.8" fill="none" />
      <path d="M22,20 Q24,28 21,35 Q23,42 20,48" stroke="rgba(180,140,220,0.3)" strokeWidth="1" fill="none" />
    </g>
    {/* Frilly edge */}
    <path d="M3,18 Q6,22 9,18 Q12,22 15,18 Q18,22 21,18 Q24,22 27,18" stroke="rgba(200,170,240,0.3)" strokeWidth="0.8" fill="none" />
  </svg>
);

/** Seahorse */
const SeahorseSVG = () => (
  <svg width="18" height="35" viewBox="0 0 18 35">
    {/* Body curve */}
    <path d="M9,2 Q14,4 13,10 Q12,14 10,16 Q9,18 9,20 Q9,22 10,24 Q11,26 10,28 Q9,30 8,32 Q7,34 6,35" 
          stroke="#5aaa90" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* Head */}
    <circle cx="9" cy="4" r="3" fill="#5aaa90" />
    {/* Snout */}
    <line x1="9" y1="4" x2="5" y2="3" stroke="#5aaa90" strokeWidth="1.5" strokeLinecap="round" />
    {/* Eye */}
    <circle cx="10" cy="3.5" r="0.8" fill="#021520" />
    {/* Dorsal fin ridge */}
    <path d="M13,10 Q16,12 13,14 Q16,16 12,17" stroke="#4d9980" strokeWidth="0.8" fill="none" />
    {/* Crown/coronet */}
    <path d="M8,1 L9,0 L10,1" stroke="#4d9980" strokeWidth="0.8" fill="none" />
    {/* Belly segments */}
    <line x1="8" y1="20" x2="10" y2="20" stroke="#6abca2" strokeWidth="0.4" opacity="0.5" />
    <line x1="8" y1="22" x2="10" y2="22" stroke="#6abca2" strokeWidth="0.4" opacity="0.5" />
    <line x1="8.5" y1="24" x2="10.5" y2="24" stroke="#6abca2" strokeWidth="0.4" opacity="0.5" />
    {/* Tail curl */}
    <path d="M6,35 Q4,34 5,32 Q3,31 4,29" stroke="#5aaa90" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

/** Crab */
const CrabSVG = () => (
  <svg width="30" height="20" viewBox="0 0 30 20">
    {/* Body */}
    <ellipse cx="15" cy="12" rx="8" ry="5" fill="#c45a3a" />
    <ellipse cx="15" cy="11" rx="6" ry="3.5" fill="#d06a4a" />
    {/* Left claw */}
    <g className="ocean-scene__crab-claw">
      <path d="M7,10 Q3,8 2,6 Q1,4 3,3 Q5,4 6,6" stroke="#c45a3a" strokeWidth="1.5" fill="#d06a4a" />
    </g>
    {/* Right claw */}
    <g className="ocean-scene__crab-claw" style={{ transformOrigin: 'bottom left' }}>
      <path d="M23,10 Q27,8 28,6 Q29,4 27,3 Q25,4 24,6" stroke="#c45a3a" strokeWidth="1.5" fill="#d06a4a" />
    </g>
    {/* Legs */}
    <line x1="8" y1="14" x2="3" y2="18" stroke="#b04a2a" strokeWidth="1" />
    <line x1="9" y1="15" x2="5" y2="19" stroke="#b04a2a" strokeWidth="1" />
    <line x1="22" y1="14" x2="27" y2="18" stroke="#b04a2a" strokeWidth="1" />
    <line x1="21" y1="15" x2="25" y2="19" stroke="#b04a2a" strokeWidth="1" />
    {/* Eyes */}
    <circle cx="12" cy="8" r="1.5" fill="#021520" />
    <circle cx="18" cy="8" r="1.5" fill="#021520" />
    <circle cx="11.7" cy="7.5" r="0.5" fill="#fff" opacity="0.5" />
    <circle cx="17.7" cy="7.5" r="0.5" fill="#fff" opacity="0.5" />
    {/* Eye stalks */}
    <line x1="12" y1="9" x2="12" y2="7" stroke="#c45a3a" strokeWidth="1" />
    <line x1="18" y1="9" x2="18" y2="7" stroke="#c45a3a" strokeWidth="1" />
  </svg>
);

/** Starfish */
const StarfishSVG = () => (
  <svg width="22" height="22" viewBox="0 0 22 22">
    <polygon 
      points="11,1 13,8 20,8 14.5,12.5 16.5,20 11,15.5 5.5,20 7.5,12.5 2,8 9,8" 
      fill="#d48a5a" 
      stroke="#c07a4a" 
      strokeWidth="0.5" 
    />
    <polygon 
      points="11,3 12.5,8.5 18,8.5 14,11.5 15.5,18 11,14.5 6.5,18 8,11.5 4,8.5 9.5,8.5" 
      fill="#e0a070" 
      opacity="0.5" 
    />
    {/* Texture dots */}
    <circle cx="11" cy="9" r="0.5" fill="#c07a4a" opacity="0.4" />
    <circle cx="9" cy="11" r="0.4" fill="#c07a4a" opacity="0.3" />
    <circle cx="13" cy="11" r="0.4" fill="#c07a4a" opacity="0.3" />
  </svg>
);

/** Sea Turtle */
const TurtleSVG = () => (
  <svg width="55" height="35" viewBox="0 0 55 35">
    {/* Shell */}
    <ellipse cx="28" cy="17" rx="16" ry="12" fill="#3a7a5a" />
    <ellipse cx="28" cy="16" rx="13" ry="9" fill="#4a8a6a" />
    {/* Shell pattern */}
    <path d="M28,7 L28,25" stroke="#3a7a5a" strokeWidth="0.8" opacity="0.5" />
    <path d="M20,10 L36,22" stroke="#3a7a5a" strokeWidth="0.8" opacity="0.5" />
    <path d="M36,10 L20,22" stroke="#3a7a5a" strokeWidth="0.8" opacity="0.5" />
    <path d="M18,16 L38,16" stroke="#3a7a5a" strokeWidth="0.8" opacity="0.5" />
    {/* Head */}
    <ellipse cx="10" cy="16" rx="5" ry="4" fill="#5a9a7a" />
    <circle cx="8" cy="15" r="1" fill="#021520" />
    <circle cx="7.6" cy="14.6" r="0.3" fill="#fff" opacity="0.5" />
    {/* Front flippers */}
    <g className="ocean-scene__turtle-flipper">
      <ellipse cx="16" cy="8" rx="7" ry="3" fill="#4a8a6a" transform="rotate(30 16 8)" />
    </g>
    <g className="ocean-scene__turtle-flipper" style={{ animationDelay: '0.75s' }}>
      <ellipse cx="16" cy="26" rx="7" ry="3" fill="#4a8a6a" transform="rotate(-30 16 26)" />
    </g>
    {/* Rear flippers */}
    <ellipse cx="42" cy="10" rx="4" ry="2.5" fill="#4a8a6a" transform="rotate(20 42 10)" />
    <ellipse cx="42" cy="24" rx="4" ry="2.5" fill="#4a8a6a" transform="rotate(-20 42 24)" />
    {/* Tail */}
    <polygon points="44,17 50,16 44,18" fill="#5a9a7a" />
  </svg>
);

/** Dolphin */
const DolphinSVG = () => (
  <svg width="60" height="25" viewBox="0 0 60 25">
    {/* Body */}
    <path d="M5,14 Q10,5 25,5 Q40,5 48,10 Q55,14 58,14" fill="#5a8aa0" />
    <path d="M5,14 Q10,20 25,20 Q40,20 48,16 Q55,14 58,14" fill="#4a7a90" />
    {/* Belly */}
    <path d="M10,16 Q20,22 35,20 Q45,18 50,14" fill="#7aaab8" opacity="0.5" />
    {/* Dorsal fin */}
    <polygon points="25,5 28,0 32,5" fill="#4a7a90" />
    {/* Tail fluke */}
    <polygon points="55,12 60,6 58,13 60,20 55,15" fill="#5a8aa0" />
    {/* Pectoral fin */}
    <polygon points="18,16 12,22 20,19" fill="#4a7a90" opacity="0.8" />
    {/* Eye */}
    <circle cx="10" cy="12" r="1.5" fill="#021520" />
    <circle cx="9.5" cy="11.5" r="0.5" fill="#fff" opacity="0.5" />
    {/* Snout/beak */}
    <path d="M5,13 Q2,13 1,14 Q2,15 5,15" fill="#5a8aa0" />
    {/* Smile line */}
    <path d="M5,14.5 Q8,16 12,15" stroke="#3a6a80" strokeWidth="0.3" fill="none" />
  </svg>
);

/** Seagull (detailed, hovering near boat) */
const SeagullSVG = ({ size = 1 }: { size?: number }) => (
  <svg width={30 * size} height={15 * size} viewBox="0 0 30 15">
    {/* Body */}
    <ellipse cx="15" cy="10" rx="6" ry="3" fill="#e8e4e0" />
    {/* Wings */}
    <path d="M9,9 Q5,4 1,3 Q3,6 9,9" fill="#d0ccc8" stroke="#b8b4b0" strokeWidth="0.3" />
    <path d="M21,9 Q25,4 29,3 Q27,6 21,9" fill="#d0ccc8" stroke="#b8b4b0" strokeWidth="0.3" />
    {/* Head */}
    <circle cx="10" cy="8" r="2.5" fill="#f0ece8" />
    {/* Beak */}
    <polygon points="7.5,8 5,8.5 7.5,9" fill="#e8a030" />
    {/* Eye */}
    <circle cx="9.5" cy="7.5" r="0.6" fill="#111" />
    {/* Tail */}
    <polygon points="21,9 24,8 23,11" fill="#d0ccc8" />
  </svg>
);


const AnimatedOceanScene = () => {
  return (
    <div className="ocean-scene" aria-hidden="true">
      {/* ── 1. Sky ── */}
      <div className="ocean-scene__sky" />

      {/* ── 2. Stars ── */}
      {stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className={[
            'ocean-scene__star',
            i % 3 === 0 ? 'ocean-scene__star--alt' : '',
            star.lg ? 'ocean-scene__star--lg' : '',
          ].filter(Boolean).join(' ')}
          style={{
            left: star.x,
            top: star.y,
            animationDelay: star.delay,
            animationDuration: `${3 + (i % 4)}s`,
          }}
        />
      ))}

      {/* Shooting star */}
      <div className="ocean-scene__shooting-star" style={{ top: '8%', left: '25%' }} />

      {/* ── 3. Sun + Glow ── */}
      <div className="ocean-scene__sun-ring" />
      <div className="ocean-scene__sun" />
      <div className="ocean-scene__light-ray" />

      {/* ── 4. Clouds ── */}
      <svg className="ocean-scene__cloud ocean-scene__cloud--1" width="200" height="60" viewBox="0 0 200 60">
        <ellipse cx="70" cy="35" rx="60" ry="18" fill="rgba(200,230,240,0.5)" />
        <ellipse cx="110" cy="28" rx="45" ry="22" fill="rgba(200,230,240,0.6)" />
        <ellipse cx="140" cy="38" rx="50" ry="16" fill="rgba(200,230,240,0.4)" />
        <ellipse cx="50" cy="40" rx="35" ry="12" fill="rgba(200,230,240,0.3)" />
      </svg>
      <svg className="ocean-scene__cloud ocean-scene__cloud--2" width="250" height="55" viewBox="0 0 250 55">
        <ellipse cx="90" cy="30" rx="70" ry="20" fill="rgba(200,230,240,0.5)" />
        <ellipse cx="150" cy="25" rx="55" ry="25" fill="rgba(200,230,240,0.6)" />
        <ellipse cx="190" cy="35" rx="40" ry="15" fill="rgba(200,230,240,0.3)" />
      </svg>
      <svg className="ocean-scene__cloud ocean-scene__cloud--3" width="180" height="50" viewBox="0 0 180 50">
        <ellipse cx="60" cy="30" rx="50" ry="15" fill="rgba(200,230,240,0.4)" />
        <ellipse cx="100" cy="25" rx="40" ry="18" fill="rgba(200,230,240,0.5)" />
        <ellipse cx="130" cy="32" rx="35" ry="12" fill="rgba(200,230,240,0.3)" />
      </svg>

      {/* ── 5. Birds (distant) ── */}
      <svg className="ocean-scene__bird ocean-scene__bird--1" width="24" height="10" viewBox="0 0 24 10">
        <path d="M0,5 Q4,1 8,5 Q12,1 16,5" stroke="rgba(10,42,60,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
      <svg className="ocean-scene__bird ocean-scene__bird--2" width="20" height="8" viewBox="0 0 20 8">
        <path d="M0,4 Q3.5,0.5 7,4 Q10.5,0.5 14,4" stroke="rgba(10,42,60,0.5)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
      <svg className="ocean-scene__bird ocean-scene__bird--3" width="18" height="8" viewBox="0 0 18 8">
        <path d="M0,4 Q3,1 6,4 Q9,1 12,4" stroke="rgba(10,42,60,0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />
      </svg>

      {/* ── Seagulls hovering near boat ── */}
      <div className="ocean-scene__seagull ocean-scene__seagull--1">
        <SeagullSVG size={1.2} />
      </div>
      <div className="ocean-scene__seagull ocean-scene__seagull--2">
        <SeagullSVG size={0.9} />
      </div>

      {/* ── 6. Mountains / Shore silhouette ── */}
      <svg className="ocean-scene__mountains" viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path d="M0,120 L0,80 Q80,40 160,65 Q240,30 360,55 Q440,20 520,50 Q600,25 680,45 Q760,15 840,40 Q920,10 1000,35 Q1080,20 1160,45 Q1240,30 1320,50 Q1380,35 1440,55 L1440,120 Z" fill="rgba(8,45,55,0.9)" />
        <path d="M0,120 L0,90 Q100,60 200,78 Q320,50 440,72 Q560,45 680,68 Q800,42 920,65 Q1040,50 1160,70 Q1280,55 1440,75 L1440,120 Z" fill="rgba(6,38,48,0.95)" />
        <path d="M155,66 L158,58 L161,66 M355,56 L358,48 L361,56 M515,51 L519,42 L523,51 M675,46 L678,38 L681,46 M835,41 L839,32 L843,41 M995,36 L999,28 L1003,36 M1155,46 L1158,38 L1161,46 M1315,51 L1319,43 L1323,51" stroke="rgba(6,38,48,0.95)" strokeWidth="3" fill="rgba(6,38,48,0.95)" />
      </svg>

      {/* ── Dolphin jumping out of water ── */}
      <div className="ocean-scene__dolphin" style={{ left: '25%', bottom: '42%' }}>
        <DolphinSVG />
      </div>
      <div className="ocean-scene__dolphin-splash" style={{ left: '25%', bottom: '39%' }}>
        <svg width="40" height="15" viewBox="0 0 40 15">
          <path d="M5,12 Q10,4 15,8 Q18,2 22,6 Q26,0 30,5 Q34,2 38,10" stroke="rgba(180,220,240,0.4)" strokeWidth="1" fill="none" />
          <circle cx="8" cy="8" r="1.5" fill="rgba(180,220,240,0.3)" />
          <circle cx="20" cy="5" r="1" fill="rgba(180,220,240,0.2)" />
          <circle cx="32" cy="7" r="1.5" fill="rgba(180,220,240,0.3)" />
        </svg>
      </div>

      {/* ── 7. Water body ── */}
      <div className="ocean-scene__water">
        {/* Wave layers */}
        <svg className="ocean-scene__wave-layer ocean-scene__wave-layer--1" viewBox="0 0 2880 25" preserveAspectRatio="none">
          <path d="M0,12 Q60,4 120,12 Q180,20 240,12 Q300,4 360,12 Q420,20 480,12 Q540,4 600,12 Q660,20 720,12 Q780,4 840,12 Q900,20 960,12 Q1020,4 1080,12 Q1140,20 1200,12 Q1260,4 1320,12 Q1380,20 1440,12 Q1500,4 1560,12 Q1620,20 1680,12 Q1740,4 1800,12 Q1860,20 1920,12 Q1980,4 2040,12 Q2100,20 2160,12 Q2220,4 2280,12 Q2340,20 2400,12 Q2460,4 2520,12 Q2580,20 2640,12 Q2700,4 2760,12 Q2820,20 2880,12" fill="none" stroke="rgba(100,200,210,0.25)" strokeWidth="1.5" />
        </svg>
        <svg className="ocean-scene__wave-layer ocean-scene__wave-layer--2" viewBox="0 0 2880 20" preserveAspectRatio="none">
          <path d="M0,10 Q90,3 180,10 Q270,17 360,10 Q450,3 540,10 Q630,17 720,10 Q810,3 900,10 Q990,17 1080,10 Q1170,3 1260,10 Q1350,17 1440,10 Q1530,3 1620,10 Q1710,17 1800,10 Q1890,3 1980,10 Q2070,17 2160,10 Q2250,3 2340,10 Q2430,17 2520,10 Q2610,3 2700,10 Q2790,17 2880,10" fill="none" stroke="rgba(80,180,200,0.2)" strokeWidth="1" />
        </svg>
        <svg className="ocean-scene__wave-layer ocean-scene__wave-layer--3" viewBox="0 0 2880 18" preserveAspectRatio="none">
          <path d="M0,9 Q120,2 240,9 Q360,16 480,9 Q600,2 720,9 Q840,16 960,9 Q1080,2 1200,9 Q1320,16 1440,9 Q1560,2 1680,9 Q1800,16 1920,9 Q2040,2 2160,9 Q2280,16 2400,9 Q2520,2 2640,9 Q2760,16 2880,9" fill="none" stroke="rgba(60,160,180,0.15)" strokeWidth="0.8" />
        </svg>

        {/* ── Underwater Light Rays ── */}
        <div className="ocean-scene__underwater-ray" style={{
          left: '20%', top: '5%', width: '60px', height: '80%',
          background: 'linear-gradient(180deg, rgba(255,200,100,0.06) 0%, transparent 100%)',
          animation: 'underwater-ray 10s ease-in-out infinite',
          clipPath: 'polygon(40% 0%, 60% 0%, 75% 100%, 25% 100%)',
        }} />
        <div className="ocean-scene__underwater-ray" style={{
          left: '45%', top: '3%', width: '50px', height: '85%',
          background: 'linear-gradient(180deg, rgba(255,200,100,0.05) 0%, transparent 100%)',
          animation: 'underwater-ray 12s ease-in-out infinite',
          animationDelay: '3s',
          clipPath: 'polygon(35% 0%, 65% 0%, 80% 100%, 20% 100%)',
        }} />
        <div className="ocean-scene__underwater-ray" style={{
          left: '70%', top: '4%', width: '45px', height: '75%',
          background: 'linear-gradient(180deg, rgba(255,200,100,0.04) 0%, transparent 100%)',
          animation: 'underwater-ray 14s ease-in-out infinite',
          animationDelay: '6s',
          clipPath: 'polygon(38% 0%, 62% 0%, 72% 100%, 28% 100%)',
        }} />

        {/* ══════════════════════════════════════════
            UNDERWATER LIVING CREATURES
            ══════════════════════════════════════════ */}

        {/* ── School of sardines (group 1) ── */}
        <div className="ocean-scene__fish-school" style={{
          top: '18%',
          '--school-duration': '22s',
          '--school-delay': '0s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDelay: '0s' }}>
            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', width: '80px' }}>
              <SmallFish color="#7abcc8" />
              <SmallFish color="#8ec8d8" />
              <SmallFish color="#7abcc8" />
              <SmallFish color="#90d0e0" />
              <SmallFish color="#7abcc8" />
              <SmallFish color="#8ec8d8" />
              <SmallFish color="#7abcc8" />
              <SmallFish color="#90d0e0" />
              <SmallFish color="#8ec8d8" />
              <SmallFish color="#7abcc8" />
              <SmallFish color="#90d0e0" />
              <SmallFish color="#8ec8d8" />
            </div>
          </div>
        </div>

        {/* ── School of sardines (group 2, swimming left) ── */}
        <div className="ocean-scene__fish-school" style={{
          top: '45%',
          '--school-duration': '28s',
          '--school-delay': '8s',
          animationName: 'swim-school-left',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDelay: '1.5s' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', width: '70px' }}>
              <SmallFish color="#6ab0b8" />
              <SmallFish color="#7ec0c8" />
              <SmallFish color="#6ab0b8" />
              <SmallFish color="#7ec0c8" />
              <SmallFish color="#6ab0b8" />
              <SmallFish color="#7ec0c8" />
              <SmallFish color="#6ab0b8" />
              <SmallFish color="#7ec0c8" />
            </div>
          </div>
        </div>

        {/* ── Mackerel fish ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-right" style={{
          top: '25%',
          '--swim-duration': '16s',
          '--swim-delay': '2s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble">
            <MackerelFish />
          </div>
        </div>

        {/* ── Tuna (large, swimming left) ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-left" style={{
          top: '35%',
          '--swim-duration': '22s',
          '--swim-delay': '5s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDuration: '2.5s' }}>
            <TunaFish />
          </div>
        </div>

        {/* ── Second Mackerel (different depth & speed) ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-right" style={{
          top: '55%',
          '--swim-duration': '20s',
          '--swim-delay': '12s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDelay: '0.8s' }}>
            <MackerelFish />
          </div>
        </div>

        {/* ── Tropical Fish (orange) ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-right" style={{
          top: '30%',
          '--swim-duration': '18s',
          '--swim-delay': '7s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDuration: '1.8s' }}>
            <TropicalFish hue={30} />
          </div>
        </div>

        {/* ── Tropical Fish (blue-green) ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-left" style={{
          top: '42%',
          '--swim-duration': '24s',
          '--swim-delay': '3s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDuration: '2.2s' }}>
            <TropicalFish hue={180} />
          </div>
        </div>

        {/* ── Tropical Fish (purple) ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-right" style={{
          top: '50%',
          '--swim-duration': '21s',
          '--swim-delay': '15s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDuration: '1.6s' }}>
            <TropicalFish hue={280} />
          </div>
        </div>

        {/* ── Swordfish (deep, slow) ── */}
        <div className="ocean-scene__fish ocean-scene__fish-swim-left" style={{
          top: '60%',
          '--swim-duration': '30s',
          '--swim-delay': '10s',
        } as React.CSSProperties}>
          <div className="ocean-scene__fish--wobble" style={{ animationDuration: '3s' }}>
            <Swordfish />
          </div>
        </div>

        {/* ── Jellyfish 1 ── */}
        <div className="ocean-scene__jellyfish" style={{ left: '15%', top: '20%', animationDelay: '0s' }}>
          <JellyfishSVG />
        </div>

        {/* ── Jellyfish 2 ── */}
        <div className="ocean-scene__jellyfish" style={{ left: '75%', top: '35%', animationDelay: '3s', opacity: 0.7, transform: 'scale(0.8)' }}>
          <JellyfishSVG />
        </div>

        {/* ── Seahorse ── */}
        <div className="ocean-scene__seahorse" style={{ right: '18%', top: '50%' }}>
          <SeahorseSVG />
        </div>

        {/* ── Sea Turtle ── */}
        <div className="ocean-scene__turtle" style={{ top: '15%' }}>
          <TurtleSVG />
        </div>

        {/* ── Bubbles (from various depths) ── */}
        {[
          { left: '48%', bottom: '5%', size: 6, duration: '5s', delay: '0s' },
          { left: '50%', bottom: '8%', size: 4, duration: '4s', delay: '1.5s', sm: true },
          { left: '52%', bottom: '3%', size: 5, duration: '6s', delay: '3s' },
          { left: '46%', bottom: '6%', size: 3, duration: '3.5s', delay: '2s', sm: true },
          { left: '20%', bottom: '10%', size: 4, duration: '4.5s', delay: '4s', sm: true },
          { left: '70%', bottom: '12%', size: 5, duration: '5.5s', delay: '1s' },
          { left: '35%', bottom: '15%', size: 3, duration: '4s', delay: '5s', sm: true },
          { left: '80%', bottom: '8%', size: 4, duration: '4.5s', delay: '6s', sm: true },
          { left: '55%', bottom: '20%', size: 6, duration: '5s', delay: '2.5s' },
          { left: '42%', bottom: '25%', size: 3, duration: '3.5s', delay: '7s', sm: true },
        ].map((b, i) => (
          <div
            key={`bubble-${i}`}
            className={`ocean-scene__bubble ${b.sm ? 'ocean-scene__bubble--sm' : ''}`}
            style={{
              left: b.left,
              bottom: b.bottom,
              width: `${b.size}px`,
              height: `${b.size}px`,
              '--bubble-duration': b.duration,
              '--bubble-delay': b.delay,
            } as React.CSSProperties}
          />
        ))}

        {/* ── Seaweed Clusters ── */}
        <div className="ocean-scene__seaweed" style={{ left: '8%', animationDelay: '0s' }}>
          <svg width="25" height="70" viewBox="0 0 25 70">
            <path d="M12,70 Q8,55 14,45 Q10,35 15,25 Q11,18 13,8 Q14,3 12,0" stroke="#2a7a5a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M8,70 Q5,58 10,48 Q7,40 11,30 Q8,22 10,15" stroke="#3a8a6a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M18,70 Q20,55 16,45 Q19,38 17,28" stroke="#2a7a5a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          </svg>
        </div>
        <div className="ocean-scene__seaweed ocean-scene__seaweed--alt" style={{ left: '22%', animationDelay: '1.5s' }}>
          <svg width="20" height="55" viewBox="0 0 20 55">
            <path d="M10,55 Q6,42 12,32 Q8,24 11,14 Q10,7 11,0" stroke="#3a8a5a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M14,55 Q16,45 13,38 Q15,30 12,22" stroke="#4a9a6a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>
        <div className="ocean-scene__seaweed" style={{ left: '60%', animationDelay: '0.8s' }}>
          <svg width="22" height="60" viewBox="0 0 22 60">
            <path d="M11,60 Q7,48 13,38 Q9,28 12,18 Q10,10 12,2" stroke="#2a7a5a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M15,60 Q18,50 14,42 Q17,34 13,26" stroke="#3a8a6a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          </svg>
        </div>
        <div className="ocean-scene__seaweed ocean-scene__seaweed--alt" style={{ left: '85%', animationDelay: '2s' }}>
          <svg width="18" height="50" viewBox="0 0 18 50">
            <path d="M9,50 Q5,38 11,28 Q7,20 10,10 Q9,5 10,0" stroke="#3a8a5a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M13,50 Q15,40 11,32 Q14,25 12,18" stroke="#4a9a6a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        {/* ── Coral formations ── */}
        <div className="ocean-scene__coral" style={{ left: '12%' }}>
          <svg width="50" height="35" viewBox="0 0 50 35">
            {/* Branch coral */}
            <path d="M25,35 L25,20 L20,10 M25,20 L30,8 M25,22 L18,15 M25,22 L32,14" stroke="#c06050" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* Round coral */}
            <circle cx="10" cy="30" r="5" fill="#d07060" />
            <circle cx="10" cy="30" r="3.5" fill="#e08070" />
            <circle cx="40" cy="32" r="4" fill="#c07060" />
            <circle cx="40" cy="32" r="2.5" fill="#d08070" />
          </svg>
        </div>
        <div className="ocean-scene__coral" style={{ right: '15%' }}>
          <svg width="45" height="30" viewBox="0 0 45 30">
            <path d="M20,30 L20,18 L15,8 M20,18 L25,5 M20,20 L13,14 M20,20 L27,12" stroke="#b05545" strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="35" cy="27" rx="6" ry="3" fill="#cc6a55" />
            <ellipse cx="8" cy="28" rx="5" ry="3" fill="#d07a65" />
          </svg>
        </div>

        {/* ── Crab ── */}
        <div className="ocean-scene__crab" style={{ left: '30%' }}>
          <CrabSVG />
        </div>

        {/* ── Starfish ── */}
        <div className="ocean-scene__starfish" style={{ left: '45%' }}>
          <StarfishSVG />
        </div>
        <div className="ocean-scene__starfish" style={{ left: '72%', animationDelay: '3s', transform: 'rotate(30deg)' }}>
          <StarfishSVG />
        </div>
      </div>

      {/* ── 8. Sun reflection on water ── */}
      <div className="ocean-scene__sun-reflection" />

      {/* ── 9. Boat with Fisherman (Large & Detailed) ── */}
      <div className="ocean-scene__boat-group">
        <div className="ocean-scene__boat-bob">
          <div className="ocean-scene__boat-rock">
            <svg width="260" height="200" viewBox="0 0 260 200">
              {/* ── Fishing Net in water (hanging from starboard side) ── */}
              <g className="ocean-scene__net-water" style={{ transformOrigin: '185px 132px' }}>
                <path d="M185,132 Q195,152 210,162 Q200,170 185,168 Q170,170 160,162 Q175,152 185,132" 
                      stroke="rgba(180,160,120,0.5)" strokeWidth="0.8" fill="rgba(180,160,120,0.12)" />
                {/* Net mesh lines */}
                <line x1="170" y1="148" x2="176" y2="162" stroke="rgba(180,160,120,0.3)" strokeWidth="0.4" />
                <line x1="178" y1="145" x2="180" y2="164" stroke="rgba(180,160,120,0.3)" strokeWidth="0.4" />
                <line x1="185" y1="142" x2="185" y2="166" stroke="rgba(180,160,120,0.3)" strokeWidth="0.4" />
                <line x1="192" y1="145" x2="190" y2="164" stroke="rgba(180,160,120,0.3)" strokeWidth="0.4" />
                <line x1="200" y1="148" x2="194" y2="162" stroke="rgba(180,160,120,0.3)" strokeWidth="0.4" />
                {/* Horizontal mesh */}
                <path d="M168,150 Q185,148 202,150" stroke="rgba(180,160,120,0.25)" strokeWidth="0.3" fill="none" />
                <path d="M165,158 Q185,155 205,158" stroke="rgba(180,160,120,0.25)" strokeWidth="0.3" fill="none" />
                {/* Fish caught in net */}
                <ellipse cx="180" cy="155" rx="5" ry="2.5" fill="rgba(140,200,220,0.4)" />
                <polygon points="188,155 191,153 191,157" fill="rgba(140,200,220,0.3)" />
                <ellipse cx="186" cy="160" rx="4" ry="2" fill="rgba(120,190,210,0.35)" />
                <ellipse cx="175" cy="162" rx="3.5" ry="1.8" fill="rgba(140,200,220,0.3)" />
              </g>

              {/* ── Rigging lines ── */}
              <line x1="100" y1="10" x2="55" y2="115" stroke="rgba(160,140,100,0.3)" strokeWidth="0.5" />
              <line x1="100" y1="10" x2="145" y2="115" stroke="rgba(160,140,100,0.3)" strokeWidth="0.5" />
              <line x1="100" y1="10" x2="100" y2="22" stroke="rgba(160,140,100,0.3)" strokeWidth="0.5" />

              {/* ── Main Sail ── */}
              <path d="M100,18 L100,115 L42,106 Z" fill="rgba(225,232,238,0.88)" stroke="rgba(180,200,210,0.5)" strokeWidth="0.6" />
              {/* Sail seam lines */}
              <line x1="100" y1="40" x2="62" y2="108" stroke="rgba(190,200,210,0.3)" strokeWidth="0.3" />
              <line x1="100" y1="60" x2="72" y2="108" stroke="rgba(190,200,210,0.3)" strokeWidth="0.3" />
              <line x1="100" y1="80" x2="82" y2="110" stroke="rgba(190,200,210,0.3)" strokeWidth="0.3" />
              {/* Sail patch */}
              <rect x="70" y="70" width="14" height="18" rx="2" fill="rgba(210,220,225,0.5)" stroke="rgba(190,200,210,0.3)" strokeWidth="0.3" />

              {/* ── Jib Sail ── */}
              <path d="M100,28 L100,108 L148,98 Z" fill="rgba(210,220,228,0.72)" stroke="rgba(180,200,210,0.35)" strokeWidth="0.5" />
              <line x1="100" y1="50" x2="132" y2="100" stroke="rgba(190,200,210,0.25)" strokeWidth="0.3" />
              <line x1="100" y1="72" x2="122" y2="102" stroke="rgba(190,200,210,0.25)" strokeWidth="0.3" />
              
              {/* ── Mast ── */}
              <line x1="100" y1="8" x2="100" y2="125" stroke="rgba(70,45,25,0.85)" strokeWidth="2.5" />
              {/* Mast top cap */}
              <circle cx="100" cy="8" r="2.5" fill="rgba(90,60,30,0.8)" />
              
              {/* ── Flag/pennant ── */}
              <path d="M100,12 L86,18 L100,22" fill="rgba(210,65,45,0.85)" stroke="rgba(180,50,35,0.6)" strokeWidth="0.3" />
              <path d="M100,12 L87,17 L100,20" fill="rgba(230,85,60,0.6)" />

              {/* ── Hull ── */}
              <path d="M30,125 Q40,152 100,155 Q160,152 175,125 Z" fill="rgba(85,52,28,0.92)" stroke="rgba(50,28,12,0.85)" strokeWidth="1.5" />
              {/* Hull inner color band */}
              <path d="M38,128 Q45,148 100,150 Q155,148 162,128 Z" fill="rgba(95,60,32,0.85)" />
              {/* Hull water line stripe */}
              <path d="M42,130 Q100,135 158,130" fill="none" stroke="rgba(120,75,40,0.5)" strokeWidth="1" />
              {/* Hull planks */}
              <line x1="42" y1="133" x2="158" y2="133" stroke="rgba(110,70,38,0.3)" strokeWidth="0.4" />
              <line x1="45" y1="137" x2="155" y2="137" stroke="rgba(110,70,38,0.3)" strokeWidth="0.4" />
              <line x1="48" y1="141" x2="152" y2="141" stroke="rgba(110,70,38,0.3)" strokeWidth="0.4" />
              <line x1="52" y1="145" x2="148" y2="145" stroke="rgba(110,70,38,0.3)" strokeWidth="0.4" />
              <line x1="58" y1="149" x2="142" y2="149" stroke="rgba(110,70,38,0.3)" strokeWidth="0.4" />
              {/* Hull keel highlight */}
              <path d="M60,152 Q100,156 140,152" fill="none" stroke="rgba(60,35,18,0.6)" strokeWidth="0.8" />
              {/* Bow detail */}
              <path d="M30,125 Q32,123 35,125" stroke="rgba(70,40,20,0.7)" strokeWidth="0.8" fill="none" />
              {/* Stern detail */}
              <path d="M170,125 Q173,123 175,125" stroke="rgba(70,40,20,0.7)" strokeWidth="0.8" fill="none" />

              {/* ── Gunwale (top edge of hull) ── */}
              <path d="M30,125 Q100,118 175,125" fill="none" stroke="rgba(110,72,38,0.8)" strokeWidth="2" />

              {/* ── Oar (resting on gunwale) ── */}
              <line x1="38" y1="120" x2="15" y2="140" stroke="rgba(130,90,50,0.7)" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="12" cy="142" rx="5" ry="2.5" fill="rgba(130,90,50,0.6)" transform="rotate(-30 12 142)" />

              {/* ── Rope coil on deck ── */}
              <g transform="translate(58, 112)">
                <ellipse cx="0" cy="0" rx="6" ry="3" fill="none" stroke="rgba(180,160,120,0.6)" strokeWidth="1.2" />
                <ellipse cx="0" cy="-1.5" rx="5" ry="2.5" fill="none" stroke="rgba(180,160,120,0.5)" strokeWidth="1" />
                <ellipse cx="0" cy="-3" rx="4" ry="2" fill="none" stroke="rgba(180,160,120,0.4)" strokeWidth="0.8" />
              </g>

              {/* ── Small anchor on hull side ── */}
              <g transform="translate(45, 128)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(100,100,110,0.6)" strokeWidth="1.2" />
                <line x1="-4" y1="8" x2="4" y2="8" stroke="rgba(100,100,110,0.6)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M-4,8 Q-5,12 -2,12" stroke="rgba(100,100,110,0.5)" strokeWidth="1" fill="none" />
                <path d="M4,8 Q5,12 2,12" stroke="rgba(100,100,110,0.5)" strokeWidth="1" fill="none" />
                <circle cx="0" cy="0" r="1.5" fill="none" stroke="rgba(100,100,110,0.5)" strokeWidth="0.8" />
              </g>

              {/* ── Wooden crate with fish ── */}
              <g transform="translate(68, 105)">
                {/* Crate body */}
                <rect x="0" y="0" width="18" height="14" rx="1" fill="rgba(140,100,55,0.7)" stroke="rgba(100,70,35,0.6)" strokeWidth="0.6" />
                {/* Crate slats */}
                <line x1="0" y1="4.5" x2="18" y2="4.5" stroke="rgba(120,85,45,0.5)" strokeWidth="0.4" />
                <line x1="0" y1="9" x2="18" y2="9" stroke="rgba(120,85,45,0.5)" strokeWidth="0.4" />
                <line x1="6" y1="0" x2="6" y2="14" stroke="rgba(120,85,45,0.4)" strokeWidth="0.3" />
                <line x1="12" y1="0" x2="12" y2="14" stroke="rgba(120,85,45,0.4)" strokeWidth="0.3" />
                {/* Fish tails poking out */}
                <polygon points="4,0 2,-5 6,-5" fill="rgba(140,210,225,0.65)" />
                <polygon points="10,0 8,-4 12,-4" fill="rgba(120,195,215,0.55)" />
                <polygon points="15,0 13,-3 17,-4" fill="rgba(150,215,230,0.5)" />
                {/* Fish body peeking */}
                <ellipse cx="4" cy="-1" rx="2.5" ry="1.5" fill="rgba(160,220,235,0.4)" />
                <ellipse cx="10" cy="-1" rx="2" ry="1.2" fill="rgba(140,210,225,0.35)" />
              </g>

              {/* ── Metal bucket with water ── */}
              <g transform="translate(142, 108)">
                <path d="M0,12 L2,0 L16,0 L18,12 Z" fill="rgba(130,135,140,0.7)" stroke="rgba(100,105,110,0.6)" strokeWidth="0.6" />
                {/* Water surface in bucket */}
                <ellipse cx="9" cy="3" rx="7" ry="2" fill="rgba(80,160,180,0.4)" />
                {/* Bucket handle */}
                <path d="M3,0 Q9,-6 15,0" fill="none" stroke="rgba(110,115,120,0.6)" strokeWidth="0.8" />
                {/* Metal bands */}
                <line x1="1" y1="4" x2="17" y2="4" stroke="rgba(100,105,110,0.4)" strokeWidth="0.4" />
                <line x1="1" y1="9" x2="17" y2="9" stroke="rgba(100,105,110,0.4)" strokeWidth="0.4" />
                {/* Fish tail in bucket */}
                <polygon points="7,0 5,-3 9,-3" fill="rgba(140,200,220,0.5)" />
              </g>

              {/* ── Lantern hanging from rigging ── */}
              <g transform="translate(88, 48)">
                {/* Lantern wire */}
                <line x1="6" y1="0" x2="12" y2="-6" stroke="rgba(120,100,60,0.5)" strokeWidth="0.5" />
                {/* Lantern body */}
                <rect x="0" y="0" width="12" height="14" rx="2" fill="rgba(200,180,80,0.35)" stroke="rgba(160,140,60,0.5)" strokeWidth="0.6" />
                {/* Glass panels */}
                <rect x="2" y="2" width="8" height="10" rx="1" fill="rgba(255,230,120,0.2)" />
                {/* Flame glow */}
                <ellipse cx="6" cy="7" rx="2.5" ry="3.5" fill="rgba(255,220,100,0.35)" />
                <ellipse cx="6" cy="7" rx="1.2" ry="2" fill="rgba(255,200,60,0.5)" />
                {/* Lantern top */}
                <path d="M3,-1 Q6,-3 9,-1" fill="rgba(160,140,60,0.6)" />
              </g>

              {/* ════════════════════════════════════════════
                  DETAILED FISHERMAN (sitting on stern)
                  ════════════════════════════════════════════ */}
              <g className="ocean-scene__fisherman" style={{ transform: 'translate(148px, 68px)' }}>
                
                {/* ── Legs (sitting, knees bent) ── */}
                {/* Left leg (thigh) */}
                <path d="M-2,38 Q-6,42 -10,48" stroke="rgba(55,50,65,0.85)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                {/* Left leg (shin to foot) */}
                <path d="M-10,48 Q-8,54 -4,56" stroke="rgba(55,50,65,0.85)" strokeWidth="4" strokeLinecap="round" fill="none" />
                {/* Left foot */}
                <path d="M-4,56 Q-1,57 2,56" stroke="rgba(170,130,100,0.85)" strokeWidth="3" strokeLinecap="round" fill="none" />
                
                {/* Right leg (thigh) */}
                <path d="M4,38 Q8,43 10,48" stroke="rgba(55,50,65,0.85)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                {/* Right leg (shin) */}
                <path d="M10,48 Q12,54 10,56" stroke="rgba(55,50,65,0.85)" strokeWidth="4" strokeLinecap="round" fill="none" />
                {/* Right foot */}
                <path d="M10,56 Q13,57 15,56" stroke="rgba(170,130,100,0.85)" strokeWidth="3" strokeLinecap="round" fill="none" />

                {/* ── Torso / Shirt ── */}
                <path d="M-6,16 Q-8,22 -7,30 Q-4,38 0,40 Q4,38 7,30 Q8,22 6,16 Z" 
                      fill="rgba(45,80,120,0.88)" stroke="rgba(35,65,100,0.6)" strokeWidth="0.5" />
                {/* Shirt wrinkle details */}
                <path d="M-3,22 Q0,24 3,22" stroke="rgba(55,90,130,0.4)" strokeWidth="0.4" fill="none" />
                <path d="M-4,28 Q0,30 4,28" stroke="rgba(55,90,130,0.4)" strokeWidth="0.4" fill="none" />
                <path d="M-2,34 Q1,36 3,34" stroke="rgba(55,90,130,0.4)" strokeWidth="0.4" fill="none" />
                {/* Collar */}
                <path d="M-3,16 Q0,18 3,16" stroke="rgba(200,190,170,0.6)" strokeWidth="0.8" fill="none" />
                
                {/* ── Vest / Waistcoat ── */}
                <path d="M-5,18 Q-6,24 -5,30 Q-3,35 0,36" fill="rgba(80,65,45,0.65)" stroke="none" />
                <path d="M5,18 Q6,24 5,30 Q3,35 0,36" fill="rgba(80,65,45,0.65)" stroke="none" />
                {/* Vest buttons */}
                <circle cx="0" cy="22" r="0.6" fill="rgba(180,170,140,0.6)" />
                <circle cx="0" cy="26" r="0.6" fill="rgba(180,170,140,0.6)" />
                <circle cx="0" cy="30" r="0.6" fill="rgba(180,170,140,0.6)" />

                {/* ── Neck ── */}
                <rect x="-2" y="12" width="4" height="5" rx="1.5" fill="rgba(175,135,105,0.9)" />

                {/* ── Head ── */}
                <ellipse cx="0" cy="7" rx="6.5" ry="7" fill="rgba(180,140,108,0.92)" />
                
                {/* ── Face Details ── */}
                {/* Eyebrows */}
                <path d="M-4,3.5 Q-2.5,2.5 -1,3.5" stroke="rgba(80,55,30,0.7)" strokeWidth="0.6" fill="none" />
                <path d="M1,3.5 Q2.5,2.5 4,3.5" stroke="rgba(80,55,30,0.7)" strokeWidth="0.6" fill="none" />
                {/* Eyes */}
                <ellipse cx="-2.5" cy="5.5" rx="1.3" ry="1" fill="rgba(255,255,255,0.85)" />
                <circle cx="-2.2" cy="5.5" r="0.7" fill="rgba(45,30,15,0.9)" />
                <circle cx="-2" cy="5.2" r="0.25" fill="rgba(255,255,255,0.6)" />
                <ellipse cx="2.5" cy="5.5" rx="1.3" ry="1" fill="rgba(255,255,255,0.85)" />
                <circle cx="2.8" cy="5.5" r="0.7" fill="rgba(45,30,15,0.9)" />
                <circle cx="3" cy="5.2" r="0.25" fill="rgba(255,255,255,0.6)" />
                {/* Nose */}
                <path d="M0,5 Q-0.5,7.5 0,8.5 Q0.5,7.5 0,5" stroke="rgba(160,120,90,0.5)" strokeWidth="0.4" fill="none" />
                {/* Smile */}
                <path d="M-2,10 Q0,12 2,10" stroke="rgba(140,95,70,0.6)" strokeWidth="0.5" fill="none" />
                {/* Cheek highlights */}
                <ellipse cx="-4" cy="8" rx="1.5" ry="1" fill="rgba(200,150,120,0.25)" />
                <ellipse cx="4" cy="8" rx="1.5" ry="1" fill="rgba(200,150,120,0.25)" />
                {/* Ear */}
                <ellipse cx="6" cy="6.5" rx="1.5" ry="2.2" fill="rgba(175,135,105,0.85)" />
                <ellipse cx="6.3" cy="6.5" rx="0.8" ry="1.2" fill="rgba(160,120,90,0.4)" />

                {/* ── Straw Hat (detailed) ── */}
                {/* Hat brim */}
                <ellipse cx="0" cy="-1" rx="11" ry="3.5" fill="rgba(210,190,130,0.92)" />
                {/* Hat brim edge shadow */}
                <ellipse cx="0" cy="-0.5" rx="11" ry="3" fill="none" stroke="rgba(180,160,100,0.4)" strokeWidth="0.3" />
                {/* Hat crown */}
                <path d="M-5,-3 Q-6,-8 -4,-11 Q0,-13 4,-11 Q6,-8 5,-3 Z" fill="rgba(200,180,120,0.92)" stroke="rgba(170,150,90,0.5)" strokeWidth="0.4" />
                {/* Weave pattern */}
                <line x1="-4" y1="-5" x2="4" y2="-5" stroke="rgba(180,160,100,0.35)" strokeWidth="0.3" />
                <line x1="-4" y1="-7" x2="4" y2="-7" stroke="rgba(180,160,100,0.35)" strokeWidth="0.3" />
                <line x1="-3.5" y1="-9" x2="3.5" y2="-9" stroke="rgba(180,160,100,0.35)" strokeWidth="0.3" />
                <line x1="-2" y1="-3" x2="-3" y2="-11" stroke="rgba(180,160,100,0.25)" strokeWidth="0.3" />
                <line x1="0" y1="-3" x2="0" y2="-12" stroke="rgba(180,160,100,0.25)" strokeWidth="0.3" />
                <line x1="2" y1="-3" x2="3" y2="-11" stroke="rgba(180,160,100,0.25)" strokeWidth="0.3" />
                {/* Hat band */}
                <rect x="-5" y="-4" width="10" height="2" rx="0.5" fill="rgba(140,80,40,0.55)" />
                {/* Band buckle */}
                <rect x="-1" y="-4" width="2" height="2" rx="0.3" fill="rgba(180,160,80,0.5)" stroke="rgba(140,120,60,0.4)" strokeWidth="0.3" />

                {/* ── Right Arm with Fishing Rod (animated) ── */}
                <g className="ocean-scene__fisherman-arm">
                  {/* Upper arm (rolled sleeve) */}
                  <path d="M6,18 Q10,16 14,12" stroke="rgba(45,80,120,0.8)" strokeWidth="4" strokeLinecap="round" fill="none" />
                  {/* Rolled sleeve cuff */}
                  <path d="M10,16 Q11,15 12,16" stroke="rgba(55,90,130,0.6)" strokeWidth="1.5" fill="none" />
                  {/* Forearm (skin) */}
                  <path d="M14,12 Q18,8 22,6" stroke="rgba(175,135,105,0.88)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {/* Forearm muscle detail */}
                  <path d="M15,11 Q17,9 19,8" stroke="rgba(160,120,90,0.3)" strokeWidth="0.4" fill="none" />
                  {/* Hand (gripping rod) */}
                  <circle cx="22" cy="6" r="2.5" fill="rgba(175,135,105,0.88)" />
                  {/* Fingers wrapped around rod */}
                  <path d="M20,5 Q21,4 22,5" stroke="rgba(160,120,90,0.6)" strokeWidth="0.5" fill="none" />
                  <path d="M22,4 Q23,3 24,4" stroke="rgba(160,120,90,0.6)" strokeWidth="0.5" fill="none" />
                  
                  {/* ── Fishing Rod ── */}
                  {/* Rod handle (thicker) */}
                  <line x1="20" y1="8" x2="22" y2="6" stroke="rgba(90,65,35,0.9)" strokeWidth="2" strokeLinecap="round" />
                  {/* Rod body (tapers) */}
                  <line x1="22" y1="6" x2="42" y2="-18" stroke="rgba(110,80,45,0.9)" strokeWidth="1.5" />
                  <line x1="42" y1="-18" x2="52" y2="-28" stroke="rgba(120,90,50,0.85)" strokeWidth="1" />
                  {/* Rod tip (thin) */}
                  <line x1="52" y1="-28" x2="56" y2="-32" stroke="rgba(130,95,55,0.8)" strokeWidth="0.5" />
                  {/* Rod guides (rings) */}
                  <circle cx="32" cy="-6" r="0.8" fill="none" stroke="rgba(140,140,150,0.6)" strokeWidth="0.4" />
                  <circle cx="40" cy="-15" r="0.7" fill="none" stroke="rgba(140,140,150,0.5)" strokeWidth="0.3" />
                  <circle cx="48" cy="-24" r="0.5" fill="none" stroke="rgba(140,140,150,0.4)" strokeWidth="0.3" />
                  {/* Rod tip marker */}
                  <circle cx="56" cy="-32" r="1" fill="rgba(220,55,35,0.8)" />
                  
                  {/* ── Fishing Line ── */}
                  <path d="M56,-32 Q60,-15 55,8 Q52,25 48,42" stroke="rgba(210,210,210,0.4)" strokeWidth="0.5" fill="none" />
                  {/* Line in water (wavy) */}
                  <path d="M48,42 Q50,48 47,52 Q45,55 46,58" stroke="rgba(210,210,210,0.3)" strokeWidth="0.3" fill="none" />
                  {/* Hook & bobber */}
                  <circle cx="46" cy="44" r="1.5" fill="rgba(220,60,40,0.6)" stroke="rgba(200,50,30,0.4)" strokeWidth="0.3" />
                  <path d="M46,58 Q47,60 45,61 Q44,60 46,58" stroke="rgba(180,180,190,0.5)" strokeWidth="0.4" fill="none" />
                </g>

                {/* ── Left Arm (holding net rope) ── */}
                {/* Upper arm */}
                <path d="M-6,18 Q-10,20 -14,24" stroke="rgba(45,80,120,0.8)" strokeWidth="4" strokeLinecap="round" fill="none" />
                {/* Rolled sleeve */}
                <path d="M-10,19 Q-11,20 -12,19" stroke="rgba(55,90,130,0.6)" strokeWidth="1.5" fill="none" />
                {/* Forearm */}
                <path d="M-14,24 Q-16,28 -14,32" stroke="rgba(175,135,105,0.88)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                {/* Hand */}
                <circle cx="-14" cy="32" r="2.2" fill="rgba(175,135,105,0.88)" />
                {/* Net rope from hand to water */}
                <path d="M-14,32 Q-18,40 -12,50 Q-6,56 2,54" stroke="rgba(180,160,120,0.55)" strokeWidth="0.8" fill="none" />
                <path d="M-14,32 Q-16,36 -14,38" stroke="rgba(180,160,120,0.5)" strokeWidth="0.6" fill="none" />

                {/* ── Sitting platform / boat edge detail ── */}
                <rect x="-8" y="38" width="20" height="3" rx="1" fill="rgba(100,65,35,0.5)" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ── 10. Boat Reflection ── */}
      <div className="ocean-scene__boat-reflection">
        <svg width="260" height="85" viewBox="0 0 260 200">
          {/* Hull reflection */}
          <path d="M30,125 Q40,152 100,155 Q160,152 175,125 Z" fill="rgba(55,38,22,0.25)" />
          {/* Sail reflections */}
          <path d="M100,28 L100,115 L42,106 Z" fill="rgba(180,200,210,0.1)" />
          <path d="M100,35 L100,108 L148,98 Z" fill="rgba(170,190,200,0.07)" />
          {/* Mast reflection */}
          <line x1="100" y1="8" x2="100" y2="125" stroke="rgba(50,35,20,0.12)" strokeWidth="2" />
          {/* Fisherman silhouette reflection */}
          <ellipse cx="148" cy="80" rx="5" ry="8" fill="rgba(35,55,75,0.08)" />
          <rect x="144" y="86" width="8" height="22" rx="2" fill="rgba(35,55,75,0.08)" />
        </svg>
      </div>

      {/* Ripples (wider for bigger boat) */}
      <div className="ocean-scene__ripple" />
      <div className="ocean-scene__ripple ocean-scene__ripple--2" />
      <div className="ocean-scene__ripple ocean-scene__ripple--3" />

      {/* ── 11. Fog ── */}
      <div className="ocean-scene__fog" />

      {/* ── 12. Content overlay ── */}
      <div className="ocean-scene__content-overlay" />
    </div>
  );
};

export default AnimatedOceanScene;
